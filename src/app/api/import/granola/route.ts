import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";
import { resolveNoteText, NoteReadError } from "@/lib/granola";

export const maxDuration = 60;

type Priority = "P0" | "P1" | "P2" | "P3";
const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];

// Structured-output schema: force Claude to return exactly this shape.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          assignees: { type: "array", items: { type: "string" } },
          category: { type: "string" },
          status: { type: "string" },
          priority: { type: "string", enum: PRIORITIES },
          dueDate: { type: "string", description: "Due date as YYYY-MM-DD, or empty string if none." },
          parentTitle: { type: "string", description: "Exact title of an existing task this is a subtask of, or empty string if it's a new top-level task." },
        },
        required: ["title", "assignees", "category", "status", "priority", "dueDate", "parentTitle"],
      },
    },
  },
  required: ["tasks"],
} as const;

interface ExtractedTask {
  title: string;
  assignees: string[];
  category: string;
  status: string;
  priority: Priority;
  dueDate: string;
  parentTitle: string;
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI import isn't configured (missing ANTHROPIC_API_KEY)." },
        { status: 501 },
      );
    }

    const body = await req.json();
    const noteText = await resolveNoteText(body.source || "");

    const [users, categories, columns, existingTasks] = await Promise.all([
      prisma.user.findMany({ orderBy: { name: "asc" } }),
      prisma.category.findMany({ orderBy: { position: "asc" } }),
      prisma.column.findMany({ orderBy: { position: "asc" } }),
      // Existing top-level, non-archived tasks — candidates to nest new items under.
      prisma.task.findMany({
        where: { parentId: null, archivedAt: null },
        select: { id: true, title: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    ]);
    const teamNames = users.map((u) => u.name);
    const categoryNames = categories.map((c) => c.name);
    const existingTitles = existingTasks.map((t) => t.title);
    const columnNames = columns.map((c) => c.name);
    const firstColumnName = columnNames[0] || "";

    // Today's date, in UTC, so the model can resolve relative deadlines ("by Friday").
    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);
    const todayWeekday = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

    const system =
      "You turn meeting notes into board tasks. This is a team's meeting — infer both what the task is " +
      "and its current status from what was said. " +
      "Be conservative and concise: only include items that are clearly, explicitly a task someone should do. " +
      "Skip vague ideas, FYIs, and decisions. When unsure, omit it. Write each title as a short imperative. " +
      "Assign people whenever the note says a specific person owns/will do/did the task AND their name is in the " +
      "team list; match the exact team name. If no clear owner, leave assignees empty. " +
      "Choose the single best-fitting category from the category list, or an empty string if none fits. " +
      "Default priority to P2 unless the note signals urgency (P0/P1) or that it's low priority (P3). " +
      "\n\nSet `status` to the column that matches what was said, choosing ONLY from the status list:\n" +
      "- If they said work has STARTED / is ongoing / being worked on → In Progress\n" +
      "- If it's a blocker / urgent / broken / emergency → Emergency\n" +
      "- If it's being tested / in QA / under review → Testing\n" +
      "- If it's DONE / finished / shipped / completed → Complete\n" +
      `- Otherwise (new, to-do, not started yet) → ${firstColumnName}\n` +
      "Use the exact status name from the list." +
      `\n\nToday is ${todayWeekday}, ${todayISO}. If a task has a deadline (e.g. 'by Friday', 'by Thursday EOD', ` +
      "'next week', 'by the 15th'), resolve it to the NEXT upcoming calendar date and return it as `dueDate` in " +
      "YYYY-MM-DD, then REMOVE the deadline phrase from the title (title is just the action, no 'by Friday'). " +
      "If there's no deadline, set `dueDate` to an empty string." +
      "\n\nAvoid creating duplicate top-level tasks. If an item clearly belongs under one of the existing tasks " +
      "below (e.g. several evidence-matching items when an 'Evidence matching' task already exists), set " +
      "`parentTitle` to that existing task's EXACT title so it's added as a subtask. Only nest when it's genuinely " +
      "part of that task; otherwise leave `parentTitle` empty and it becomes a new top-level task." +
      `\n\nTeam members: ${teamNames.join(", ") || "(none)"}` +
      `\nCategories: ${categoryNames.join(", ") || "(none)"}` +
      `\nStatuses (columns): ${columnNames.join(", ") || "(none)"}` +
      `\nExisting tasks (nest under these when appropriate): ${existingTitles.join(" | ") || "(none)"}`;

    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output_config: { format: { type: "json_schema", schema: SCHEMA } } as any,
      messages: [{ role: "user", content: `Meeting note:\n\n${noteText}` }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = textBlock ? (textBlock as any).text : "{}";
    let parsed: { tasks?: ExtractedTask[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Couldn't parse the extracted tasks. Try again." }, { status: 502 });
    }

    // Map extracted names to real ids.
    const userByLower = new Map(users.map((u) => [u.name.toLowerCase(), u]));
    const catByLower = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
    const colByLower = new Map(columns.map((c) => [c.name.toLowerCase(), c]));
    const taskByLowerTitle = new Map(existingTasks.map((t) => [t.title.toLowerCase(), t]));
    const fallbackCategory = categories[0];
    const fallbackColumn = columns[0];

    const proposals = (parsed.tasks ?? [])
      .filter((t) => t && typeof t.title === "string" && t.title.trim())
      .map((t) => {
        const matchedUsers = (t.assignees ?? [])
          .map((n) => userByLower.get(String(n).trim().toLowerCase()))
          .filter(Boolean) as typeof users;
        const cat = (t.category && catByLower.get(t.category.trim().toLowerCase())) || fallbackCategory;
        const col = (t.status && colByLower.get(t.status.trim().toLowerCase())) || fallbackColumn;
        const priority = PRIORITIES.includes(t.priority) ? t.priority : "P2";
        const dueDate = typeof t.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : "";
        const parent = t.parentTitle ? taskByLowerTitle.get(t.parentTitle.trim().toLowerCase()) : undefined;
        return {
          title: t.title.trim(),
          priority,
          dueDate,
          columnId: col?.id ?? "",
          columnName: col?.name ?? "",
          categoryId: cat?.id ?? "",
          categoryName: cat?.name ?? "",
          parentId: parent?.id ?? "",
          parentTitle: parent?.title ?? "",
          assigneeIds: matchedUsers.map((u) => u.id),
          assigneeNames: matchedUsers.map((u) => u.name),
        };
      });

    return NextResponse.json({ tasks: proposals });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e instanceof NoteReadError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error(e);
    return NextResponse.json({ error: "Import failed. Try again." }, { status: 500 });
  }
}

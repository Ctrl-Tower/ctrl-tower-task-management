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
        },
        required: ["title", "assignees", "category", "status", "priority"],
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

    const [users, categories, columns] = await Promise.all([
      prisma.user.findMany({ orderBy: { name: "asc" } }),
      prisma.category.findMany({ orderBy: { position: "asc" } }),
      prisma.column.findMany({ orderBy: { position: "asc" } }),
    ]);
    const teamNames = users.map((u) => u.name);
    const categoryNames = categories.map((c) => c.name);
    const columnNames = columns.map((c) => c.name);
    const firstColumnName = columnNames[0] || "";

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
      `\n\nTeam members: ${teamNames.join(", ") || "(none)"}` +
      `\nCategories: ${categoryNames.join(", ") || "(none)"}` +
      `\nStatuses (columns): ${columnNames.join(", ") || "(none)"}`;

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
        return {
          title: t.title.trim(),
          priority,
          columnId: col?.id ?? "",
          columnName: col?.name ?? "",
          categoryId: cat?.id ?? "",
          categoryName: cat?.name ?? "",
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

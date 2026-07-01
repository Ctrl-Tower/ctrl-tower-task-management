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
          priority: { type: "string", enum: PRIORITIES },
        },
        required: ["title", "assignees", "category", "priority"],
      },
    },
  },
  required: ["tasks"],
} as const;

interface ExtractedTask {
  title: string;
  assignees: string[];
  category: string;
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

    const [users, categories] = await Promise.all([
      prisma.user.findMany({ orderBy: { name: "asc" } }),
      prisma.category.findMany({ orderBy: { position: "asc" } }),
    ]);
    const teamNames = users.map((u) => u.name);
    const categoryNames = categories.map((c) => c.name);

    const system =
      "You extract action items from a meeting note and return them as board tasks. " +
      "Be conservative and concise: only include items that are clearly, explicitly a task someone " +
      "should do. Skip vague ideas, FYIs, decisions, and aspirational statements. When unsure, omit it. " +
      "Write each title as a short imperative (e.g. 'Set up CI pipeline'). " +
      "Assign people ONLY when the note clearly says a specific person owns that task AND that person's " +
      "name is in the team list; match to the exact team name. If no clear owner, leave assignees empty. " +
      "Choose the single best-fitting category from the category list, or an empty string if none fits. " +
      "Default priority to P2 unless the note clearly signals urgency (P0/P1) or that it's low priority (P3). " +
      `\n\nTeam members: ${teamNames.join(", ") || "(none)"}` +
      `\nCategories: ${categoryNames.join(", ") || "(none)"}`;

    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output_config: { format: { type: "json_schema", name: "extracted_tasks", schema: SCHEMA } } as any,
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

    // Map extracted names/categories to real ids.
    const userByLower = new Map(users.map((u) => [u.name.toLowerCase(), u]));
    const catByLower = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
    const fallbackCategory = categories[0];

    const proposals = (parsed.tasks ?? [])
      .filter((t) => t && typeof t.title === "string" && t.title.trim())
      .map((t) => {
        const matchedUsers = (t.assignees ?? [])
          .map((n) => userByLower.get(String(n).trim().toLowerCase()))
          .filter(Boolean) as typeof users;
        const cat = (t.category && catByLower.get(t.category.trim().toLowerCase())) || fallbackCategory;
        const priority = PRIORITIES.includes(t.priority) ? t.priority : "P2";
        return {
          title: t.title.trim(),
          priority,
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

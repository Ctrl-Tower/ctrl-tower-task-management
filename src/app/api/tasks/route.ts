import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";
import { taskInclude, toTaskDTO } from "@/lib/serialize";
import { getDoneColumnId } from "@/lib/archive";

// POST /api/tasks — create a task in a given column+category cell.
export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const body = await req.json();
    const title = (body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
    if (!body.columnId || !body.categoryId) {
      return NextResponse.json({ error: "columnId and categoryId required" }, { status: 400 });
    }

    // Append to the end of the target column.
    const last = await prisma.task.findFirst({
      where: { columnId: body.columnId },
      orderBy: { position: "desc" },
    });
    const position = last ? last.position + 1 : 0;

    // If created straight into the Complete column, start its completion clock.
    const doneColumnId = await getDoneColumnId();

    // Accept a due date as either a full ISO string or a YYYY-MM-DD (stored at UTC midnight).
    let dueDate: Date | null = null;
    if (typeof body.dueDate === "string" && body.dueDate.trim()) {
      const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) ? `${body.dueDate}T00:00:00.000Z` : body.dueDate);
      if (!isNaN(parsed.getTime())) dueDate = parsed;
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: body.description || null,
        priority: body.priority || "P2",
        columnId: body.columnId,
        categoryId: body.categoryId,
        parentId: typeof body.parentId === "string" && body.parentId ? body.parentId : null,
        position,
        dueDate,
        createdById: user.id,
        completedAt: body.columnId === doneColumnId ? new Date() : null,
      },
      include: taskInclude,
    });
    return NextResponse.json(toTaskDTO(task), { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

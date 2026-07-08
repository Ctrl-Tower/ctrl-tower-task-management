import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";
import { taskInclude, toTaskDTO, getTaskDTO } from "@/lib/serialize";
import { getDoneColumnId } from "@/lib/archive";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/tasks/[id] — fetch the full task (used to refresh after a staged save).
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const dto = await getTaskDTO(id);
    if (!dto) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(dto);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function parseDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined; // not provided -> leave unchanged
  if (v === null || v === "") return null; // explicit clear
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? undefined : d;
}

// PATCH /api/tasks/[id] — update fields and/or move (column/category/position).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const doneColumnId = await getDoneColumnId();

    // Unarchive: bring the task back to the board, reset its completion window,
    // and append it to the end of its (still-Complete) column.
    if (body.unarchive === true) {
      const last = await prisma.task.findFirst({
        where: { columnId: existing.columnId, archivedAt: null },
        orderBy: { position: "desc" },
      });
      const fresh = await prisma.task.update({
        where: { id },
        data: {
          archivedAt: null,
          completedAt: existing.columnId === doneColumnId ? new Date() : null,
          position: last ? last.position + 1 : 0,
        },
        include: taskInclude,
      });
      return NextResponse.json(toTaskDTO(fresh));
    }

    // Manual archive: hide the task from the board now (stamp completedAt if it
    // wasn't already, so an unarchive later restores a fresh completion window).
    if (body.archive === true) {
      const fresh = await prisma.task.update({
        where: { id },
        data: { archivedAt: new Date(), completedAt: existing.completedAt ?? new Date() },
        include: taskInclude,
      });
      return NextResponse.json(toTaskDTO(fresh));
    }

    const targetColumn = body.columnId ?? existing.columnId;
    // A task is reordered/moved when its column changes or an explicit position is given.
    // Category is just a label now — changing it does NOT reposition the task.
    const moving = targetColumn !== existing.columnId || typeof body.position === "number";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof body.title === "string") data.title = body.title.trim();
    // categoryId may be a real id, or "" / null to clear it (uncategorized).
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
    if (body.description !== undefined) data.description = body.description || null;
    if (typeof body.priority === "string") data.priority = body.priority;
    const sd = parseDate(body.startDate);
    if (sd !== undefined) data.startDate = sd;
    const dd = parseDate(body.dueDate);
    if (dd !== undefined) data.dueDate = dd;

    // Track completion: entering the Complete column stamps completedAt; leaving clears it.
    if (targetColumn !== existing.columnId) {
      if (targetColumn === doneColumnId) data.completedAt = new Date();
      else if (existing.columnId === doneColumnId) {
        data.completedAt = null;
        data.archivedAt = null;
      }
    }

    await prisma.$transaction(async (tx) => {
      if (moving) {
        // Pull current siblings of the target column (excluding this task).
        const siblings = await tx.task.findMany({
          where: { columnId: targetColumn, id: { not: id } },
          orderBy: { position: "asc" },
        });
        const idx = Math.max(0, Math.min(body.position ?? siblings.length, siblings.length));
        const ordered = [...siblings];
        ordered.splice(idx, 0, { ...existing } as (typeof siblings)[number]);

        // Renumber the target column.
        for (let i = 0; i < ordered.length; i++) {
          const t = ordered[i];
          if (t.id === id) {
            await tx.task.update({ where: { id }, data: { ...data, columnId: targetColumn, position: i } });
          } else if (t.position !== i) {
            await tx.task.update({ where: { id: t.id }, data: { position: i } });
          }
        }

        // If we left a different column, compact it.
        if (targetColumn !== existing.columnId) {
          const old = await tx.task.findMany({
            where: { columnId: existing.columnId },
            orderBy: { position: "asc" },
          });
          for (let i = 0; i < old.length; i++) {
            if (old[i].position !== i) await tx.task.update({ where: { id: old[i].id }, data: { position: i } });
          }
        }
      } else {
        await tx.task.update({ where: { id }, data });
      }
    });

    const fresh = await prisma.task.findUnique({ where: { id }, include: taskInclude });
    return NextResponse.json(toTaskDTO(fresh));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    await prisma.task.delete({ where: { id } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

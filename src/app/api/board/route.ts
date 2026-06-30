import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";
import { taskInclude, toTaskDTO } from "@/lib/serialize";
import { sweepArchive } from "@/lib/archive";
import type { CategoryDTO, ColumnDTO, UserDTO } from "@/lib/types";

// GET /api/board — everything the board needs, fetched client-side and cached.
export async function GET() {
  try {
    await requireSession();
    await sweepArchive();

    const [columns, categories, tasks, users] = await Promise.all([
      prisma.column.findMany({ orderBy: { position: "asc" } }),
      prisma.category.findMany({ orderBy: { position: "asc" } }),
      prisma.task.findMany({ where: { archivedAt: null }, include: taskInclude, orderBy: { position: "asc" } }),
      prisma.user.findMany({ orderBy: { name: "asc" } }),
    ]);

    const columnDTOs: ColumnDTO[] = columns.map((c) => ({ id: c.id, name: c.name, color: c.color, position: c.position }));
    const categoryDTOs: CategoryDTO[] = categories.map((c) => ({ id: c.id, name: c.name, color: c.color, position: c.position }));
    const userDTOs: UserDTO[] = users.map((u) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor }));

    return NextResponse.json({
      columns: columnDTOs,
      categories: categoryDTOs,
      users: userDTOs,
      tasks: tasks.map(toTaskDTO),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

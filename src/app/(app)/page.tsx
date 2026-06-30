import { prisma } from "@/lib/db";
import { taskInclude, toTaskDTO } from "@/lib/serialize";
import { sweepArchive } from "@/lib/archive";
import { Board } from "@/components/board/Board";
import type { CategoryDTO, ColumnDTO, UserDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  // Auto-archive stale completed tasks before rendering the board.
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
  const taskDTOs = tasks.map(toTaskDTO);

  return (
    <Board
      columns={columnDTOs}
      categories={categoryDTOs}
      initialTasks={taskDTOs}
      users={userDTOs}
    />
  );
}

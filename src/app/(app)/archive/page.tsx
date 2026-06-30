import { prisma } from "@/lib/db";
import { taskInclude, toTaskDTO } from "@/lib/serialize";
import { ArchiveList } from "@/components/archive/ArchiveList";
import type { CategoryDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const [tasks, categories] = await Promise.all([
    prisma.task.findMany({
      where: { archivedAt: { not: null } },
      include: taskInclude,
      orderBy: { archivedAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
  ]);

  const cats: CategoryDTO[] = categories.map((c) => ({ id: c.id, name: c.name, color: c.color, position: c.position }));

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto p-6">
      <ArchiveList initialTasks={tasks.map(toTaskDTO)} categories={cats} />
    </div>
  );
}

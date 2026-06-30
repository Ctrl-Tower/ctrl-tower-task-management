import { prisma } from "@/lib/db";
import { getArchiveAfterDays } from "@/lib/settings";

/** The completion column = the last column (highest position). */
export async function getDoneColumnId(): Promise<string | null> {
  const col = await prisma.column.findFirst({ orderBy: { position: "desc" } });
  return col?.id ?? null;
}

/**
 * Archive any task that has sat in the completion column longer than the
 * configured threshold. Idempotent — safe to call on every board load.
 * Returns the number of tasks newly archived.
 */
export async function sweepArchive(): Promise<number> {
  const [doneColumnId, days] = await Promise.all([getDoneColumnId(), getArchiveAfterDays()]);
  if (!doneColumnId) return 0;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const res = await prisma.task.updateMany({
    where: {
      columnId: doneColumnId,
      archivedAt: null,
      completedAt: { not: null, lte: cutoff },
    },
    data: { archivedAt: new Date() },
  });
  return res.count;
}

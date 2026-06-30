import { prisma } from "@/lib/db";

const ARCHIVE_KEY = "archiveAfterDays";
const DEFAULT_ARCHIVE_DAYS = 7;

/** Days a task may sit in the completion column before it is auto-archived. */
export async function getArchiveAfterDays(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: ARCHIVE_KEY } });
  const n = row ? parseInt(row.value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ARCHIVE_DAYS;
}

export async function setArchiveAfterDays(days: number): Promise<number> {
  const clamped = Math.max(1, Math.min(365, Math.floor(days)));
  await prisma.setting.upsert({
    where: { key: ARCHIVE_KEY },
    update: { value: String(clamped) },
    create: { key: ARCHIVE_KEY, value: String(clamped) },
  });
  return clamped;
}

-- Replace the LOW/MEDIUM/HIGH/URGENT priority scale with P0..P3 (P0 = most urgent).
-- Map: URGENT->P0, HIGH->P1, MEDIUM->P2, LOW->P3. Data is preserved.
CREATE TYPE "Priority_new" AS ENUM ('P0', 'P1', 'P2', 'P3');

ALTER TABLE "Task" ALTER COLUMN "priority" DROP DEFAULT;

ALTER TABLE "Task"
  ALTER COLUMN "priority" TYPE "Priority_new"
  USING (
    CASE "priority"::text
      WHEN 'URGENT' THEN 'P0'
      WHEN 'HIGH'   THEN 'P1'
      WHEN 'MEDIUM' THEN 'P2'
      WHEN 'LOW'    THEN 'P3'
    END
  )::"Priority_new";

DROP TYPE "Priority";
ALTER TYPE "Priority_new" RENAME TO "Priority";

ALTER TABLE "Task" ALTER COLUMN "priority" SET DEFAULT 'P2';

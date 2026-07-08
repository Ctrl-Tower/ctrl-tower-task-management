-- Remove subtasks: drop the self-relation and parentId column.
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_parentId_fkey";
DROP INDEX IF EXISTS "Task_parentId_idx";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "parentId";

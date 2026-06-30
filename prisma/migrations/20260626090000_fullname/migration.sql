-- Replace `username` with a unique `name` (full name) as the login identity.
-- Dropping the column also drops its dependent unique index `User_username_key`.
ALTER TABLE "User" DROP COLUMN "username";

-- Ensure full names are unique.
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

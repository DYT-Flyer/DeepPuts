-- Make username unique
CREATE UNIQUE INDEX IF NOT EXISTS "User_name_key" ON "User"("name");

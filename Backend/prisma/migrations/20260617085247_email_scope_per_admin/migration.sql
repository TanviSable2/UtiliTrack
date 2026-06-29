/*
  Warnings:

  - A unique constraint covering the columns `[email,created_by_admin_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_email_created_by_admin_id_key" ON "users"("email", "created_by_admin_id");

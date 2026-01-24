/*
  Warnings:

  - Added the required column `profile_picture` to the `Client` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "created_by_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_extra_data_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needs_password_change" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profile_picture" TEXT NOT NULL;

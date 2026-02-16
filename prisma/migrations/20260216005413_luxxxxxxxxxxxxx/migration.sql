/*
  Warnings:

  - You are about to drop the column `contact_email` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `contact_first_name` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `contact_last_name` on the `ClientCompany` table. All the data in the column will be lost.
  - You are about to drop the column `contact_phone` on the `ClientCompany` table. All the data in the column will be lost.
  - Added the required column `contact_name` to the `ClientCompany` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ClientCompany_contact_email_key";

-- AlterTable
ALTER TABLE "ClientCompany" DROP COLUMN "contact_email",
DROP COLUMN "contact_first_name",
DROP COLUMN "contact_last_name",
DROP COLUMN "contact_phone",
ADD COLUMN     "contact_name" TEXT NOT NULL;

/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Product` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[auth_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[document_number]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `auth_id` to the `User` table without a default value. This is not possible if the table is not empty.
  - The required column `id_user` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "status_enum" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "worker_role" AS ENUM ('admin', 'warehouse');

-- CreateEnum
CREATE TYPE "client_type_enum" AS ENUM ('person', 'company');

-- CreateEnum
CREATE TYPE "document_type_enum" AS ENUM ('dni', 'ruc');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "id",
DROP COLUMN "password",
DROP COLUMN "updatedAt",
ADD COLUMN     "auth_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "document_number" TEXT,
ADD COLUMN     "document_type" "document_type_enum",
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "id_user" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "status_enum" NOT NULL DEFAULT 'active',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id_user");

-- CreateTable
CREATE TABLE "Worker" (
    "id_worker" TEXT NOT NULL,
    "id_user" TEXT NOT NULL,
    "role" "worker_role" NOT NULL,
    "employment_status" "status_enum" NOT NULL DEFAULT 'active',
    "hired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id_worker")
);

-- CreateTable
CREATE TABLE "Client" (
    "id_client" TEXT NOT NULL,
    "id_user" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "client_type" "client_type_enum" NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id_client")
);

-- CreateTable
CREATE TABLE "ClientCompany" (
    "id_client" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_first_name" TEXT NOT NULL,
    "contact_last_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,

    CONSTRAINT "ClientCompany_pkey" PRIMARY KEY ("id_client")
);

-- CreateIndex
CREATE UNIQUE INDEX "Worker_id_user_key" ON "Worker"("id_user");

-- CreateIndex
CREATE UNIQUE INDEX "Client_id_user_key" ON "Client"("id_user");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCompany_contact_email_key" ON "ClientCompany"("contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "User_auth_id_key" ON "User"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_document_number_key" ON "User"("document_number");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "User"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "User"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompany" ADD CONSTRAINT "ClientCompany_id_client_fkey" FOREIGN KEY ("id_client") REFERENCES "Client"("id_client") ON DELETE RESTRICT ON UPDATE CASCADE;

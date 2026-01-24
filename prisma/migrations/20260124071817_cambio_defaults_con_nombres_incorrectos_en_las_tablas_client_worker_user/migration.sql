/*
  Warnings:

  - The values [person,company] on the enum `client_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [dni,ruc] on the enum `document_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [active,inactive] on the enum `status_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [admin,warehouse] on the enum `worker_role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "client_type_enum_new" AS ENUM ('Persona', 'Empresa');
ALTER TABLE "Client" ALTER COLUMN "client_type" TYPE "client_type_enum_new" USING ("client_type"::text::"client_type_enum_new");
ALTER TYPE "client_type_enum" RENAME TO "client_type_enum_old";
ALTER TYPE "client_type_enum_new" RENAME TO "client_type_enum";
DROP TYPE "public"."client_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "document_type_enum_new" AS ENUM ('DNI', 'RUC');
ALTER TABLE "User" ALTER COLUMN "document_type" TYPE "document_type_enum_new" USING ("document_type"::text::"document_type_enum_new");
ALTER TYPE "document_type_enum" RENAME TO "document_type_enum_old";
ALTER TYPE "document_type_enum_new" RENAME TO "document_type_enum";
DROP TYPE "public"."document_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "status_enum_new" AS ENUM ('Activo', 'Inactivo');
ALTER TABLE "public"."User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Worker" ALTER COLUMN "employment_status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "status_enum_new" USING ("status"::text::"status_enum_new");
ALTER TABLE "Worker" ALTER COLUMN "employment_status" TYPE "status_enum_new" USING ("employment_status"::text::"status_enum_new");
ALTER TYPE "status_enum" RENAME TO "status_enum_old";
ALTER TYPE "status_enum_new" RENAME TO "status_enum";
DROP TYPE "public"."status_enum_old";
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'Activo';
ALTER TABLE "Worker" ALTER COLUMN "employment_status" SET DEFAULT 'Activo';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "worker_role_new" AS ENUM ('Admin', 'Warehouse');
ALTER TABLE "Worker" ALTER COLUMN "role" TYPE "worker_role_new" USING ("role"::text::"worker_role_new");
ALTER TYPE "worker_role" RENAME TO "worker_role_old";
ALTER TYPE "worker_role_new" RENAME TO "worker_role";
DROP TYPE "public"."worker_role_old";
COMMIT;

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "profile_picture" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'Activo';

-- AlterTable
ALTER TABLE "Worker" ALTER COLUMN "employment_status" SET DEFAULT 'Activo';

-- CreateEnum
CREATE TYPE "role_enum" AS ENUM ('Administrador', 'Cliente', 'Trabajador');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "role_enum";

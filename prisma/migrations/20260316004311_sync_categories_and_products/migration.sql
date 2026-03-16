/*
  Warnings:

  - Added the required column `id_category` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "id_category" TEXT NOT NULL,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "is_best_seller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_new_in" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Category" (
    "id_category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id_category")
);

-- CreateTable
CREATE TABLE "ClientAddress" (
    "id_address" TEXT NOT NULL,
    "id_client" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "reference" TEXT,
    "department" TEXT,
    "province" TEXT,
    "district" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAddress_pkey" PRIMARY KEY ("id_address")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "ClientAddress_id_client_idx" ON "ClientAddress"("id_client");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "Category"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAddress" ADD CONSTRAINT "ClientAddress_id_client_fkey" FOREIGN KEY ("id_client") REFERENCES "Client"("id_client") ON DELETE CASCADE ON UPDATE CASCADE;

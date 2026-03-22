/*
  Warnings:

  - The primary key for the `Product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - Added the required column `base_price` to the `Product` table without a default value. This is not possible if the table is not empty.
  - The required column `id_product` was added to the `Product` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Product" DROP CONSTRAINT "Product_pkey",
DROP COLUMN "id",
DROP COLUMN "price",
DROP COLUMN "stock",
ADD COLUMN     "base_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "id_product" TEXT NOT NULL,
ADD CONSTRAINT "Product_pkey" PRIMARY KEY ("id_product");

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id_variant" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku_variant" TEXT NOT NULL,
    "id_product" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id_variant")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_variant_key" ON "ProductVariant"("sku_variant");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_id_product_fkey" FOREIGN KEY ("id_product") REFERENCES "Product"("id_product") ON DELETE CASCADE ON UPDATE CASCADE;

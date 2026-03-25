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
CREATE INDEX "ClientAddress_id_client_idx" ON "ClientAddress"("id_client");

-- AddForeignKey
ALTER TABLE "ClientAddress" ADD CONSTRAINT "ClientAddress_id_client_fkey" FOREIGN KEY ("id_client") REFERENCES "Client"("id_client") ON DELETE CASCADE ON UPDATE CASCADE;

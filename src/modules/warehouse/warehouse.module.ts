import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Warehouse, WarehouseSchema } from './schema/warehouse.schema';
import { WarehouseStock, WarehouseStockSchema } from './schema/warehouse-stock.schema';
import { WarehouseDocument, WarehouseDocumentSchema } from './schema/warehouse-document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: WarehouseStock.name, schema: WarehouseStockSchema },
      { name: WarehouseDocument.name, schema: WarehouseDocumentSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class WarehouseModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryMovement, InventoryMovementSchema,
  PurchaseOrder, PurchaseOrderSchema,
  PrePurchaseOrder, PrePurchaseOrderSchema,
} from './schema';
import { ProductVariant, ProductVariantSchema, Product, ProductSchema } from '../product/schemas';
import { Supplier, SupplierSchema } from '../supplier/schema/supplier.schema';
import { Workshop, WorkshopSchema } from '../workshop/schema/workshop.schema';
import { WarehouseModule } from '../warehouse/warehouse.module';

import { InventoryService, PurchaseOrdersService, RankingService } from './service';
import { PrePurchaseOrdersService } from './service/prepurchase-order.service';
import { SuppliersService } from '../supplier/service/suppliers.service';
import { StorageService } from '../firebase/services';

import { InventoryController } from './controller/inventory.controller';
import { PurchaseOrdersController } from './controller/purchase-orders.controller';
import { PrePurchaseOrdersController } from './controller/prepurchase.controller';

@Module({
  imports: [
    WarehouseModule, // Provee Warehouse, WarehouseStock y WarehouseDocument via MongooseModule export
    MongooseModule.forFeature([
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: PrePurchaseOrder.name, schema: PrePurchaseOrderSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: Workshop.name, schema: WorkshopSchema },
    ]),
  ],
  controllers: [
    InventoryController,
    PurchaseOrdersController,
    PrePurchaseOrdersController,
  ],
  providers: [
    InventoryService,
    PurchaseOrdersService,
    RankingService,
    PrePurchaseOrdersService,
    SuppliersService,
    StorageService,
  ],
  exports: [InventoryService, PurchaseOrdersService, RankingService, PrePurchaseOrdersService],
})
export class InventoryModule {}

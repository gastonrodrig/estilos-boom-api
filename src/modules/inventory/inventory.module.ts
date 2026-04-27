import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { 
  InventoryMovement, InventoryMovementSchema, 
  PurchaseOrder, PurchaseOrderSchema 
} from './schema';
import { ProductVariant, ProductVariantSchema } from '../product/schemas'; // Importante
import { Supplier, SupplierSchema } from '../supplier/schema/supplier.schema'; // Importante
import { PurchaseOrdersService, RankingService, InventoryService } from './service';
import { PurchaseOrdersController,InventoryController } from './controller';
import { SuppliersController } from '../supplier/controller/suppliers.controller'; // Si quieres exponer endpoints de proveedores aquí
import { SuppliersService } from '../supplier/service/suppliers.service';
import { StorageService } from '../firebase/services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      // DEBES AGREGAR ESTOS DOS AQUÍ:
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: Supplier.name, schema: SupplierSchema },
    ]),
  ],
  controllers: [
    PurchaseOrdersController, 
    InventoryController, 
    SuppliersController
  ],
  providers: [
    PurchaseOrdersService, 
    RankingService, 
    InventoryService, 
    SuppliersService, // Agrégalo si no tienes un SuppliersModule aparte
    StorageService
  ],
  // Exporta los servicios si otros módulos (como Ventas) necesitan el stock
  exports: [InventoryService, PurchaseOrdersService] 
})
export class InventoryModule {}
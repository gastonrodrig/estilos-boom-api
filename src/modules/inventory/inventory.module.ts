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
import { PrePurchaseOrder, PrePurchaseOrderSchema } from './schema/prepurchaseOrder.schema';
import { PrePurchaseOrdersService } from './service/prepurchase-order.service';
import { PrePurchaseOrdersController } from './controller/prepurchase.controller';
import { Workshop, WorkshopSchema } from '../workshop/schema/workshop.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryMovement.name, schema: InventoryMovementSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      // DEBES AGREGAR ESTOS DOS AQUÍ:
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: PrePurchaseOrder.name, schema: PrePurchaseOrderSchema },
      { name: Workshop.name, schema: WorkshopSchema }
    ]),
  ],
  controllers: [
    PurchaseOrdersController, 
    InventoryController, 
    SuppliersController,
    PrePurchaseOrdersController // Controlador para manejar precompras
  ],
  providers: [
    PurchaseOrdersService, 
    RankingService, 
    InventoryService, 
    SuppliersService, // Agrégalo si no tienes un SuppliersModule aparte
    StorageService,
    PrePurchaseOrdersService // Servicio para manejar la lógica de precompras
  ],
  // Exporta los servicios si otros módulos (como Ventas) necesitan el stock
  exports: [InventoryService, PurchaseOrdersService, RankingService, PrePurchaseOrdersService] 
})
export class InventoryModule {}
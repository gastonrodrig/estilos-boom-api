import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductionController } from './controller/production.controller';
import { ProductionService } from './service/production.service';
import { ProductionOrder, ProductionOrderSchema } from './schema/production-order.schema';
import { WorkshopModule } from '../workshop/workshop.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { Product, ProductSchema, ProductVariant, ProductVariantSchema } from '../product/schemas';
import { Supply, SupplySchema } from '../supplie/schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductionOrder.name, schema: ProductionOrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: Supply.name, schema: SupplySchema },
    ]),
    WorkshopModule,
    WarehouseModule,
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}

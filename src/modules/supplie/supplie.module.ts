import { MongooseModule } from '@nestjs/mongoose';
import { 
    Supply,
    SupplySchema,
    SupplyStock,
    SupplyStockSchema,
    SupplyTransaction,
    SupplyTransactionSchema,
} from './schema';
import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { SupplyController } from './controller/supplie.controller';
import { SupplyWarehouseController } from './controller/supply-warehouse.controller';
import { SupplyService } from './service/supplie.service';
import { SupplyWarehouseService } from './service/supply-warehouse.service';

import { Product, ProductSchema, ProductVariant, ProductVariantSchema } from '../product/schemas';
import { ProductionOrder, ProductionOrderSchema } from '../production/schema/production-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Supply.name, schema: SupplySchema },
      { name: SupplyStock.name, schema: SupplyStockSchema },
      { name: SupplyTransaction.name, schema: SupplyTransactionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: ProductionOrder.name, schema: ProductionOrderSchema },
    ]),
  ],
  controllers: [SupplyController, SupplyWarehouseController],
  providers: [SupplyService, SupplyWarehouseService],
})
export class SupplyModule implements OnApplicationBootstrap {
  constructor(private readonly supplyService: SupplyService) {}

  async onApplicationBootstrap() {
    await this.supplyService.seedBaseSupplies();
  }
}
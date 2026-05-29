import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductionController } from './controller/production.controller';
import { ProductionService } from './service/production.service';
import { ProductionOrder, ProductionOrderSchema } from './schema/production-order.schema';
import { WorkshopModule } from '../workshop/workshop.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductionOrder.name, schema: ProductionOrderSchema },
    ]),
    WorkshopModule,
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}

import { MongooseModule } from '@nestjs/mongoose';
import { 
    Supply,
    SupplySchema,
    SupplyDocument,
} from './schema';
import { Module } from '@nestjs/common';
import { SupplyController } from './controller/supplie.controller';
import { SupplyService } from './service/supplie.service';

import { Product, ProductSchema, ProductVariant, ProductVariantSchema } from '../product/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Supply.name, schema: SupplySchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      
    ]),
  ],
  controllers: [SupplyController],
  providers: [SupplyService],
})
export class SupplyModule {}
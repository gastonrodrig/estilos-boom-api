import { MongooseModule } from '@nestjs/mongoose';
import {
  Category,
  CategorySchema,
  Product,
  ProductSchema,
  ProductVariant,
  ProductVariantSchema,
} from './schemas';
import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ProductController, CategoryController } from './controllers';
import { ProductService, CategoryService } from './services';
import { StorageService } from '../firebase/services';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { Supply, SupplySchema, SupplyStock, SupplyStockSchema } from '../supplie/schema';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { Favorite, FavoriteSchema } from '../favorites/schemas/favorite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Supply.name, schema: SupplySchema },
      { name: SupplyStock.name, schema: SupplyStockSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Favorite.name, schema: FavoriteSchema },
    ]),
    WarehouseModule,
  ],
  controllers: [ProductController, CategoryController],
  providers: [ProductService, CategoryService, StorageService],
})
export class ProductModule implements OnApplicationBootstrap {
  constructor(private readonly categoryService: CategoryService) {}

  async onApplicationBootstrap() {
    await this.categoryService.migrateAbbr();
  }
}
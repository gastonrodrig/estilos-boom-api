import { MongooseModule } from '@nestjs/mongoose';
import { 
  Category,
  CategorySchema,
  Product,
  ProductSchema,
  ProductVariant, 
  ProductVariantSchema 
} from './schemas';
import { Module } from '@nestjs/common';
import { ProductController, CategoryController } from './controllers';
import { ProductService, CategoryService } from './services';
import { StorageService } from '../firebase/services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [ProductController, CategoryController],
  providers: [ProductService, CategoryService, StorageService],
})
export class ProductModule {}
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Suggestion, SuggestionSchema } from './schemas';
import { SuggestionsController } from './controllers';
import { SuggestionsService } from './services';
import { Favorite, FavoriteSchema } from '../favorites/schemas';
import { Order, OrderSchema } from '../sales/schemas/order.schema';
import { Product, ProductSchema } from '../product/schemas/product.schema';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Suggestion.name, schema: SuggestionSchema },
      { name: Favorite.name, schema: FavoriteSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsModule {}

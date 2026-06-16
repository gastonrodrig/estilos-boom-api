import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Favorite, FavoriteSchema } from './schemas';
import { FavoritesController } from './controllers';
import { FavoritesService } from './services';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favorite.name, schema: FavoriteSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}

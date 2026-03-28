import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module';
import { CartController } from './controllers';
import { CartService } from './services';
import { Cart, CartSchema } from './schemas';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
		forwardRef(() => UserModule),
	],
	controllers: [CartController],
	providers: [CartService],
	exports: [CartService, MongooseModule],
})
export class CartModule {}


import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CartItem, CartItemSchema } from './cart-item.schema';

export type CartDocument = Cart & Document;

@Schema({ collection: 'Cart', timestamps: true })
export class Cart {
	@Prop({ required: true, unique: true, index: true })
	auth_id: string;

	@Prop({ type: [CartItemSchema], default: [] })
	items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);


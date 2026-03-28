import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CartItem {
	@Prop({ required: true })
	productId: string;

	@Prop({ required: true })
	name: string;

	@Prop({ required: true, min: 0 })
	price: number;

	@Prop({ required: true, min: 1 })
	quantity: number;

	@Prop({ required: true })
	size: string;

	@Prop({ required: true })
	color: string;

	@Prop({ default: null })
	image?: string;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);


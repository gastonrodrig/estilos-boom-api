import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductVariantDocument = ProductVariant & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'ProductVariant',
})
export class ProductVariant {
  @Prop({ required: true })
  size: string;

  @Prop({
    type: {
      name: { type: String, required: true }, 
      hex: { type: String, required: true },  
    },
    required: true,
    _id: false 
  })
  color: {
    name: string;
    hex: string;
  };

  @Prop({ default: 10 }) 
  min_stock_alert: number;

  @Prop({ required: true, unique: true })
  sku_variant: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  id_product: Types.ObjectId;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);
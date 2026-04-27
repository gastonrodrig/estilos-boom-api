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

  @Prop({ required: true })
  color: string;

  // El stock real que está en los estantes del almacén
  @Prop({ default: 0 })
  physical_stock: number;

  // Productos ya vendidos/separados que aún no salen del almacén
  @Prop({ default: 0 })
  reserved_stock: number;

  @Prop({ required: true, unique: true })
  sku_variant: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  id_product: Types.ObjectId;
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);

  ProductVariantSchema.virtual('available_stock').get(function (this: ProductVariantDocument) {
  return this.physical_stock - this.reserved_stock;
});

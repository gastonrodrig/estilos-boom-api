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
      name: { type: String, required: true }, // Ej: "Rosa Barbie"
      hex: { type: String, required: true },  // Ej: "#FF4FA3"
    },
    required: true,
    _id: false // Evita que Mongo le genere un ID único a este subobjeto
  })
  color: {
    name: string;
    hex: string;
  };

  // 🔥 AGREGAR ESTO: El stock disponible para la venta
  @Prop({ default: 0 })
  stock: number;

  // El stock real físico en estantes
  @Prop({ default: 0 })
  physical_stock: number;

  @Prop({ default: 0 })
  reserved_stock: number;

  @Prop({ default: 10 }) 
  min_stock_alert: number;

  @Prop({ required: true, unique: true })
  sku_variant: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  id_product: Types.ObjectId;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

// El virtual ahora es una capa extra de seguridad para tu lógica de negocio
ProductVariantSchema.virtual('calculated_available').get(function (this: ProductVariantDocument) {
  return this.physical_stock - this.reserved_stock;
});
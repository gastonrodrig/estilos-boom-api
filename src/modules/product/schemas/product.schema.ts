import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'Product',
})
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, unique: true })
  sku: string;

  @Prop({ required: true })
  base_price: number;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  is_best_seller: boolean;

  @Prop({ default: true })
  is_new_in: boolean;

  @Prop({ type: [String] })
  images: string[];

  @Prop({ required: true, enum: ['MUJER', 'HOMBRE', 'UNISEX'] })
  gender: string; 

  @Prop()
  style_type: string; // Ej: 'CASUAL PREMIUM' (visto en tu imagen)

  @Prop()
  composition: string; // Ej: '95% ALGODÓN, 5% ELASTANO'

  @Prop()
  season: string; // Ej: 'PRIMAVERA 2026'

  // --- BENEFICIOS / BULLET POINTS (Los puntos rosas de la Imagen 1) ---
  @Prop({ type: [String] })
  highlights: string[]; 

  // --- FLEXIBILIDAD EXTRA ---
  @Prop({ type: Map, of: String })
  technical_details: Map<string, string>;

  @Prop()
  custom_size_guide_url: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  id_category: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

// Subdocumento para los materiales de la Ficha Técnica (No lleva _id propio)
@Schema({ _id: false })
class SupplyItem {
  @Prop({ type: String, required: true })
  name: string; // ej. "Elástico 2cm"

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: true })
  unit: string; // ej. "metros", "unidades"
}

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

  @Prop({ type: String, enum: ['RETAIL', 'PRODUCCION'], default: 'RETAIL', required: true })
  origin_type: string;

  @Prop({ type: [SupplyItem], default: undefined })
  technical_sheet?: SupplyItem[]; // Solo se poblará si origin_type === 'PRODUCCION'
}

export const ProductSchema = SchemaFactory.createForClass(Product);

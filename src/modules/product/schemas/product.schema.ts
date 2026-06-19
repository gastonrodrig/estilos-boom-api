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

  @Prop({ default: false })
  is_discount: boolean;

  @Prop({
    type: [{
      url: { type: String, required: true },
      color: { type: String, default: null },
    }],
    _id: false,
    default: [],
  })
  images: { url: string; color?: string | null }[];

  @Prop({ required: true, enum: ['MUJER', 'HOMBRE', 'UNISEX'] })
  gender: string; 

  @Prop()
  style_type: string; 

  @Prop()
  composition: string;

  // Indica si la tela principal tiene estampado (útil para ficha técnica de insumos)
  @Prop({ enum: ['LISO', 'ESTAMPADO', 'BORDADO', 'TEXTURIZADO'], default: 'LISO' })
  fabric_print: string;

  // Solo se usa cuando fabric_print === 'ESTAMPADO' (ej: "flores", "rayas", "geométrico")
  @Prop()
  print_pattern: string;

  @Prop()
  season: string;

  @Prop({ type: [String] })
  highlights: string[]; 

  @Prop({ type: Map, of: String })
  technical_details: Map<string, string>;

  @Prop()
  custom_size_guide_url: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  id_category: Types.ObjectId;

  @Prop({ type: String, enum: ['RETAIL', 'PRODUCCION'], default: 'RETAIL', required: true })
  origin_type: string;

  @Prop({
    type: [{
      id_supply:   { type: Types.ObjectId, ref: 'Supply', required: true },
      detail:      { type: String, default: '' },   // ej: "Blanco 12mm redondo", "Viscosa 150cm"
      quantity:    { type: Number, required: true },
      applies_to:  { type: String, default: 'TODOS' }, // 'TODOS' o nombre de color ej: 'Rojo'
    }],
    _id: false,
    default: [],
  })
  technical_sheet?: {
    id_supply:  Types.ObjectId;
    detail?:    string;
    quantity:   number;
    applies_to: string;
  }[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
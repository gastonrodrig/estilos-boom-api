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
  style_type: string; 

  @Prop()
  composition: string; 

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

  @Prop({ type: String, enum: ['RETAIL'], default: 'RETAIL', required: true })
  origin_type: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
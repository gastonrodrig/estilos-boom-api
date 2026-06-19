import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'Category',
})
export class Category {
  @Prop({ required: true })
  name: string;

  // Campo interno para comparación case-insensitive; único a nivel BD
  @Prop({ unique: true, sparse: true })
  _normalized_name: string;

  // Abreviatura de 4 letras usada en la generación de SKU (ej: VEST, BUSA, PANT)
  @Prop({ maxlength: 4 })
  abbr: string;

  @Prop()
  description: string;

  @Prop({ default: true })
  status: boolean;

  @Prop()
  size_guide_url: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

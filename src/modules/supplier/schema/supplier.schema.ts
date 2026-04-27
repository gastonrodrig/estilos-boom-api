import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'Supplier' })
export class Supplier {
  @Prop({ required: true })
  name_company: string;

  @Prop({ required: true, unique: true })
  ruc: string;

  @Prop()
  contact_person: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop({ default: true })
  status: boolean;

  // Campos para el Algoritmo de Ranking
  @Prop({ default: 0 })
  rating: number; // 0 a 5

  @Prop({ default: 0 })
  total_orders: number;

  @Prop({ default: 0 })
  on_time_delivery_rate: number; // Porcentaje (0-100)
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WarehouseDocument = Warehouse & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'Warehouse',
})
export class Warehouse {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string; 

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  ubigeo: string; 

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  district: string;

  @Prop()
  phone: string;

  @Prop({ default: true })
  is_active: boolean;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);
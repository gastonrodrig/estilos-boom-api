import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WarehouseDocument = Warehouse & Document;

@Schema({ timestamps: true, collection: 'Warehouse' })
export class Warehouse {
  @Prop({ required: true, unique: true })
  name: string; // 'ALMACEN_CENTRAL' o 'TIENDA_PRINCIPAL'

  @Prop({ default: true })
  is_active: boolean;
}
export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);
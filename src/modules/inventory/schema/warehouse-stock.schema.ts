import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type WarehouseStockDocument = WarehouseStock & Document;

@Schema({ timestamps: true, collection: 'WarehouseStock' })
export class WarehouseStock {
  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  id_warehouse: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Variant', required: true })
  id_variant: Types.ObjectId;

  @Prop({ default: 0, required: true })
  stock: number; // Stock real disponible en este almacén específico
}
export const WarehouseStockSchema = SchemaFactory.createForClass(WarehouseStock);
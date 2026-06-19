import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupplyStockDocument = SupplyStock & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'SupplyStock',
})
export class SupplyStock {
  @Prop({ type: Types.ObjectId, ref: 'Supply', required: true })
  id_supply: Types.ObjectId;

  @Prop()
  specification: string;

  @Prop({ default: 0, required: true })
  physical_stock: number;

  @Prop({ default: 0 })
  average_cost: number;

  @Prop()
  location: string;
}

export const SupplyStockSchema = SchemaFactory.createForClass(SupplyStock);

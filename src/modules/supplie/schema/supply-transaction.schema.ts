import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupplyTransactionDocument = SupplyTransaction & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'SupplyTransaction',
})
export class SupplyTransaction {
  @Prop({ required: true, enum: ['PURCHASE', 'DISPATCH', 'RETURN'] })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'Workshop' })
  id_workshop?: Types.ObjectId;

  @Prop()
  supplier_name?: string; // Para compras de Gamarra

  @Prop({
    type: [{
      id_supply: { type: Types.ObjectId, ref: 'Supply', required: true },
      quantity: { type: Number, required: true },
      cost: { type: Number }, // Costo unitario
      specifications: { type: String } // Medidas, características
    }],
    required: true,
    _id: false
  })
  items: { id_supply: Types.ObjectId; quantity: number; cost?: number; specifications?: string }[];

  @Prop()
  notes?: string;
}

export const SupplyTransactionSchema = SchemaFactory.createForClass(SupplyTransaction);

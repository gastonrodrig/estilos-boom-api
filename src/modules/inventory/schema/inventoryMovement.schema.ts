import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryMovementDocument = InventoryMovement & Document;

@Schema({ timestamps: { createdAt: 'created_at' }, collection: 'InventoryMovement' })
export class InventoryMovement {
  @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true })
  id_variant: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder' }) // Opcional (solo si viene de compra)
  id_purchase_order: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Worker', required: true })
  id_worker: Types.ObjectId;

  @Prop({ enum: ['ENTRADA', 'SALIDA', 'AJUSTE'], required: true })
  type: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  previous_stock: number;

  @Prop({ required: true })
  new_stock: number;

  @Prop()
  reason: string;
}

export const InventoryMovementSchema = SchemaFactory.createForClass(InventoryMovement);
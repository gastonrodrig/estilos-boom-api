import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryTransferDocument = InventoryTransfer & Document;

@Schema({ timestamps: { createdAt: 'created_at' }, collection: 'InventoryTransfer' })
export class InventoryTransfer {
  @Prop({ required: true, unique: true })
  code: string; // Ej: 'TR-2026-001'

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  id_source_warehouse: Types.ObjectId; // Desde dónde sale (Almacén)

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  id_target_warehouse: Types.ObjectId; // A dónde llega (Tienda)

  @Prop({ type: Types.ObjectId, ref: 'Worker', required: true })
  id_sender_worker: Types.ObjectId; // Quién envía la mercadería

  @Prop({ type: Types.ObjectId, ref: 'Worker' })
  id_receiver_worker: Types.ObjectId; // Quién la recibe en tienda (Opcional hasta que llegue)

  @Prop({ 
    type: [{
      id_variant: { type: Types.ObjectId, ref: 'ProductVariant' },
      quantity: { type: Number, required: true }
    }],
    required: true
  })
  items: any[];

  @Prop({ type: String, enum: ['PENDIENTE', 'COMPLETADO', 'RECHAZADO'], default: 'PENDIENTE' })
  status: string;
}

export const InventoryTransferSchema = SchemaFactory.createForClass(InventoryTransfer);
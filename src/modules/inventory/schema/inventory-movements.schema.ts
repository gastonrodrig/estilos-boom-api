import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryMovementDocument = InventoryMovement & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'InventoryMovements',
})
export class InventoryMovement {
  @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true })
  id_variant: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  id_warehouse: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WarehouseDocument', required: true })
  id_document: Types.ObjectId; // El documento de arriba que gatilló este movimiento

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  id_worker: Types.ObjectId; // Almacenero que ejecutó el cambio

  @Prop({ required: true, enum: ['ENTRADA', 'SALIDA'] })
  type: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  previous_stock: number; // Stock físico antes de la acción

  @Prop({ required: true })
  new_stock: number; // Stock físico después de la acción

  @Prop({ required: true, enum: ['COMPRA', 'VENTA', 'TRANSFERENCIA', 'AJUSTE', 'PRODUCCION'] })
  reason: string;
}

export const InventoryMovementSchema = SchemaFactory.createForClass(InventoryMovement);
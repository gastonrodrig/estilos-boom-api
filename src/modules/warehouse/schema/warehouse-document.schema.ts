import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Document, Types } from 'mongoose';

export type WarehouseDocumentDocument = WarehouseDocument & Document;

@Schema({ _id: false })
class WarehouseDocumentItem {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true })
  id_variant: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity_expected: number;

  @Prop({ default: 0 })
  quantity_received: number;

  @Prop()
  incidence_note: string;
}
const WarehouseDocumentItemSchema = SchemaFactory.createForClass(WarehouseDocumentItem);

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'WarehouseDocuments',
})
export class WarehouseDocument {
  @Prop({ required: true, unique: true })
  document_number: string; // Ej: "DOC-2026-0001"

  @Prop({ required: true, enum: ['INGRESO_COMPRA', 'INGRESO_PRODUCCION', 'SALIDA_VENTA', 'TRANSFERENCIA', 'AJUSTE'] })
  type: string;

  @Prop({ required: true, enum: ['PENDIENTE', 'EN_TRANSITO', 'COMPLETADO', 'CANCELADO'], default: 'PENDIENTE' })
  status: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null })
  id_source_warehouse: Types.ObjectId; // null si es una compra externa

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null })
  id_target_warehouse: Types.ObjectId; // null si es una venta externa

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, default: null })
  id_origin_doc: Types.ObjectId; // Referencia dinámica (ID de la Orden de Compra, etc.)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  id_sender_worker: Types.ObjectId; // Trabajador que despacha o admin que registra

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  id_receiver_worker: Types.ObjectId; // Almacenero que da la conformidad en destino

  @Prop({ type: [WarehouseDocumentItemSchema], required: true })
  items: WarehouseDocumentItem[];

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop()
  notes: string;
}

export const WarehouseDocumentSchema = SchemaFactory.createForClass(WarehouseDocument);
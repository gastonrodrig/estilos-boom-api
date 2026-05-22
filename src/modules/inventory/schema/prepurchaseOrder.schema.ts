import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// 1. Define PRIMERO el item (Sub-documento base)
@Schema({ _id: false })
export class PurchaseOrderItem {
  @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true })
  id_variant: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  unit_cost: number;
}

// 2. Ahora SupplierQuote puede encontrar a PurchaseOrderItem y ser dinámico
@Schema({ _id: false })
export class SupplierQuote {
  @Prop({ type: String, enum: ['Supplier'], required: true })
  onModel: string; // Determina si es un Proveedor

  @Prop({ type: Types.ObjectId, refPath: 'quotes.onModel', required: true })
  id_agent: Types.ObjectId; // El ID del agente (Proveedor o Taller)

  @Prop({ type: [PurchaseOrderItem] })
  items: PurchaseOrderItem[];

  @Prop()
  total_amount: number;

  @Prop()
  ranking_score: number;

  @Prop({ default: 'PENDIENTE' })
  quote_status: string;
}

// 3. Esquema principal de la Pre-Orden (Universal)
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'PrePurchaseOrder' })
export class PrePurchaseOrder {
  @Prop({ required: true, unique: true })
  pre_order_number: string;

  @Prop({ type: String, enum: ['ABASTECIMIENTO'], default: 'ABASTECIMIENTO' })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'Worker', required: true })
  id_worker: Types.ObjectId;

  @Prop({ type: [PurchaseOrderItem], required: true })
  base_items: PurchaseOrderItem[];

  @Prop({ type: [SupplierQuote] })
  quotes: SupplierQuote[];

  @Prop({
    enum: ['SOLICITANDO', 'COMPARANDO', 'CONVERTIDA', 'EN_REVISION', 'COMPLETADA'],
    default: 'SOLICITANDO'
  })
  status: string;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder' })
  id_purchase_order?: Types.ObjectId; 
}

export type PrePurchaseOrderDocument = PrePurchaseOrder & Document;
export const PrePurchaseOrderSchema = SchemaFactory.createForClass(PrePurchaseOrder);
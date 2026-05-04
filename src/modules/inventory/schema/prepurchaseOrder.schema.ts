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

// 2. Ahora SupplierQuote puede encontrar a PurchaseOrderItem
@Schema({ _id: false })
export class SupplierQuote {
  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  id_supplier: Types.ObjectId;

  @Prop({ type: [PurchaseOrderItem] }) // Aquí ya no dará error
  items: PurchaseOrderItem[];

  @Prop()
  total_amount: number;

  @Prop()
  ranking_score: number;

  @Prop({ default: 'PENDIENTE' })
  quote_status: string;
}

// 3. Esquema principal de la Pre-Orden
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'PrePurchaseOrder' })
export class PrePurchaseOrder {
  @Prop({ required: true, unique: true })
  pre_order_number: string;

  @Prop({ type: Types.ObjectId, ref: 'Worker', required: true })
  id_worker: Types.ObjectId;

  @Prop({ type: [PurchaseOrderItem], required: true })
  base_items: PurchaseOrderItem[];

  @Prop({ type: [SupplierQuote] })
  quotes: SupplierQuote[];

  @Prop({
    enum: ['SOLICITANDO', 'COMPARANDO', 'CONVERTIDA', 'CANCELADA'],
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
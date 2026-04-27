import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Definimos el sub-documento para los items de la compra
@Schema({ _id: false }) // No necesita ID propio en Mongo si es sub-doc
class PurchaseOrderItem {
  @Prop({ type: Types.ObjectId, ref: 'ProductVariant', required: true })
  id_variant: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  unit_cost: number;
}

export type PurchaseOrderDocument = PurchaseOrder & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'PurchaseOrder' })
export class PurchaseOrder {
  @Prop({ required: true, unique: true })
  order_number: string; // OC-001, etc.

  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  id_supplier: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Worker', required: true })
  id_worker: Types.ObjectId;

  @Prop({ type: [PurchaseOrderItem], required: true })
  items: PurchaseOrderItem[];

  @Prop({ required: true })
  total_amount: number;

  @Prop({  
    enum: ['PENDIENTE', 'CONFIRMADO', 'RECIBIDO', 'CANCELADO'], 
    default: 'PENDIENTE' 
  })
  status: string;

  @Prop()
  notes: string;

  @Prop()
  delivery_date_estimated: Date;

  @Prop()
  delivery_date_actual: Date;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
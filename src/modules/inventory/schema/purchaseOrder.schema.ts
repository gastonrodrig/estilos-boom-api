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

  @Prop({ type: String, enum: ['Supplier', 'Workshop'], required: true, default: 'Supplier' })
  onModel: string;

  @Prop({ type: Types.ObjectId, refPath: 'onModel', required: true })
  id_supplier: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Worker', required: true })
  id_worker: Types.ObjectId;

  @Prop({ type: [PurchaseOrderItem], required: true })
  items: PurchaseOrderItem[];

  @Prop({ required: true })
  total_amount: number;

  @Prop({  
    enum: ['PENDIENTE', 'EN_REVISION', 'COMPLETADA', 'CANCELADA'], 
    default: 'PENDIENTE' 
  })
  status: string;

  @Prop()
  notes: string;

  @Prop()
  delivery_date_estimated: Date;

  @Prop()
  delivery_date_actual: Date;

  @Prop()
  quality_rating: number; // 1 a 5, opcional para evaluar la calidad de la mercadería recibida

  @Prop()
  shipping_cost: number; // Costo de envío asociado a esta orden, opcional

  @Prop({ default: 0 })
  qty_incidences: number; // 👈 Guarda el acumulado de prendas defectuosas/mermas de la orden

  @Prop()
  quality_observations: string; // 👈 Almacena las notas del control de calidad ("Prendas descosidas", etc.)
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string; // Ej: PORD-0042 o ORD-0042

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  clientName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  paymentMethod: string; // 'yape', 'plin', 'transfer', 'mercadopago'

  @Prop({ required: true })
  status: string; // 'PRE_ORDER', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'

  @Prop({ type: Array, default: [] })
  items: any[];

  @Prop()
  deliveryMethod: string;
  
  @Prop({ type: Types.ObjectId, ref: 'PaymentManualTransaction' })
  manualPaymentId?: Types.ObjectId; // Referencia al pago manual si aplica

  @Prop()
  trackingNumber?: string; // Guía de remisión / Datos del Courier / Datos del Motorizado

  @Prop()
  shippingEvidenceUrl?: string; // Foto de la guía o del paquete despachado
}

export const OrderSchema = SchemaFactory.createForClass(Order);

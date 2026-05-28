import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MercadoPagoTransactionDocument = MercadoPagoTransaction & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'MercadoPagoTransaction',
})
export class MercadoPagoTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'PEN' })
  currency: string;

  @Prop({ required: true })
  status: string; // e.g., 'approved', 'pending', 'rejected'

  @Prop()
  statusDetail: string; // e.g., 'accredited', 'pending_contingency', 'cc_rejected_bad_filled_security_code'

  @Prop({ required: true, unique: true })
  paymentId: string; // MercadoPago payment ID

  @Prop()
  paymentMethodId: string; // e.g., 'visa', 'master', 'yape'

  @Prop()
  paymentTypeId: string; // e.g., 'credit_card', 'ticket', 'bank_transfer'

  @Prop()
  payerEmail: string;

  @Prop()
  externalReference: string; // Internal order ID or reference

  @Prop({ type: Object })
  rawResponse: Record<string, any>; // Limited non-sensitive data
}

export const MercadoPagoTransactionSchema = SchemaFactory.createForClass(MercadoPagoTransaction);

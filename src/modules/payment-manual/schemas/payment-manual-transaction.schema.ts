import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentManualTransactionDocument = PaymentManualTransaction & Document;

@Schema({
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'PaymentManualTransaction',
})
export class PaymentManualTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  paymentMethod: string; // 'qr' (Yape/Plin) or 'transfer'

  @Prop({ required: true })
  operationNumber: string;

  @Prop({ required: true, default: 'pending_validation' })
  status: string; // 'pending_validation', 'approved', 'rejected'
}

export const PaymentManualTransactionSchema = SchemaFactory.createForClass(PaymentManualTransaction);

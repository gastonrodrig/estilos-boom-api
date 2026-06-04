import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true })
  invoiceNumber: string; // Ej: BOL-001-00042 o FAC-001-00010

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  clientName: string;

  @Prop({ required: true })
  documentType: string; // 'DNI', 'CE', 'RUC'

  @Prop({ required: true })
  documentNumber: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  status: string; // 'EMITIDA', 'ANULADA'

  @Prop()
  pdfUrl?: string; // Futura integración para descargar el PDF de la boleta
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

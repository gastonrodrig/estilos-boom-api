import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClientAddressDocument = ClientAddress & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'ClientAddress',
})
export class ClientAddress {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  id_client: Types.ObjectId;

  @Prop({ required: true })
  address_line: string;

  @Prop()
  reference: string;

  @Prop()
  department: string;

  @Prop()
  province: string;

  @Prop()
  district: string;

  @Prop({ default: false })
  is_default: boolean;
}

export const ClientAddressSchema = SchemaFactory.createForClass(ClientAddress);

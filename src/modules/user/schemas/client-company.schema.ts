import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClientCompanyDocument = ClientCompany & Document;

@Schema({
  collection: 'ClientCompany',
})
export class ClientCompany {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true, unique: true })
  id_client: Types.ObjectId;

  @Prop({ required: true })
  company_name: string;

  @Prop({ required: true })
  contact_name: string;
}

export const ClientCompanySchema = SchemaFactory.createForClass(ClientCompany);

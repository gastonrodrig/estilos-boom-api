import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({
  timestamps: { createdAt: 'registered_at' },
  collection: 'Client',
})
export class Client {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  id_user: Types.ObjectId;

  @Prop()
  address: string;

  @Prop({ default: 'Persona' })
  client_type: string;

  @Prop({ default: false })
  created_by_admin: boolean;

  @Prop({ default: false })
  is_extra_data_completed: boolean;

  @Prop({ default: true })
  needs_password_change: boolean;

  @Prop()
  profile_picture: string;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

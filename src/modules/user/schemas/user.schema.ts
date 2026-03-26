import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'User',
})
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  auth_id: string;

  @Prop()
  phone: string;

  @Prop()
  first_name: string;

  @Prop()
  last_name: string;

  @Prop()
  document_type: string;

  @Prop({ unique: true, sparse: true })
  document_number: string;

  @Prop()
  role: string;

  @Prop({ default: 'Activo' })
  status: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

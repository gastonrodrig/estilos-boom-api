import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Estado } from 'src/core/constants/app.constants';

export type WorkshopDocument = Workshop & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'Workshops',
})
export class Workshop {
  @Prop({ required: true, length: 255 })
  name: string;

  @Prop({ length: 255 })
  description: string;

  @Prop({ length: 150 })
  contact_person: string;

  @Prop({ length: 20 })
  phone: string;

  @Prop({ length: 255 })
  address: string;

  @Prop({ enum: Estado, default: Estado.ACTIVO })
  status: Estado;
}

export const WorkshopSchema = SchemaFactory.createForClass(Workshop);

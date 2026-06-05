import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Suggestion {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  productId?: Types.ObjectId;

  @Prop({ required: true })
  category: string;

  @Prop()
  sizeRequested?: string;

  @Prop()
  colorSuggested?: string;

  @Prop()
  message?: string;

  @Prop({ default: 'RECEIVED' })
  status: string;
}

export const SuggestionSchema = SchemaFactory.createForClass(Suggestion);

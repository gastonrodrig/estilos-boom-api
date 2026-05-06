import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkshopDocument = Workshop & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'Workshop' })
export class Workshop {
  @Prop({ required: true })
  name_company: string;

  @Prop({ required: true, unique: true })
  ruc: string;

  @Prop()
  contact_person: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop({ required: true })
  specialty: string; // Ej: "Vestidos", "Sacos"

  @Prop({ default: 0 })
  weekly_capacity: number; // Cantidad de prendas por semana

  @Prop({ 
    type: String, 
    enum: ['AVAILABLE', 'LIMITED', 'SATURATED', 'INACTIVE'], 
    default: 'AVAILABLE' 
  })
  operating_status: string;

  @Prop({ default: true })
  status: boolean; // Soft delete / Active status

  // --- CAMPOS PARA EL ALGORITMO DE RANKING (Igual que Proveedores) ---
  @Prop({ default: 0 })
  rating: number; // Hp: Puntaje Histórico (0-5)

  @Prop({ default: 0 })
  total_orders: number; 

  @Prop({ default: 0 })
  on_time_delivery_rate: number; 

  @Prop({ default: 0 })
  incidence_rate: number; 

  @Prop({ default: 0 })
  final_rating: number; 
}

export const WorkshopSchema = SchemaFactory.createForClass(Workshop);

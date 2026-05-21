import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SupplyDocument = Supply & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'Supply',
})
export class Supply {
  @Prop({ required: true, unique: true })
  name: string; // Ej: "Tela Viscosa Estampada", "Botón Metálico 12mm"

  @Prop({ required: true, enum: ['metros', 'unidades', 'rollos', 'conos'] })
  unit: string; // Restringido a tus tipos de la captura

  @Prop({ default: true })
  is_active: boolean; // Controla si figura como "Activo" o "Suspendido"

    @Prop({ 
    required: true, 
    enum: ['Telas', 'Hilos', 'Cierres y Cremalleras', 'Elásticos', 'Botones y Broches', 'Entretelas', 'Acabados', 'Otros'] 
    })
    category: string; // Fiel a tu dropdown de la captura

    @Prop()
    notes: string; // Notas internas para el equipo
}

export const SupplySchema = SchemaFactory.createForClass(Supply);
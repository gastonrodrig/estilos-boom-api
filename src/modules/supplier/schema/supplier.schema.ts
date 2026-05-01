import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'Supplier' })
export class Supplier {
  @Prop({ required: true })
  name_company: string; // Ej: "Textiles del Sur S.A.C." -> Nombre legal de la empresa.

  @Prop({ required: true, unique: true })
  ruc: string; // Ej: "20601234567" -> Identificador tributario único.

  @Prop()
  contact_person: string; // Ej: "Carlos Pérez" -> Nombre del representante de ventas.

  @Prop()
  email: string; // Ej: "ventas@textilessur.pe" -> Correo para órdenes de compra.

  @Prop()
  phone: string; // Ej: "+51987654321" -> Teléfono de contacto directo.

  @Prop()
  address: string; // Ej: "Av. Gamarra 456, La Victoria" -> Ubicación física del proveedor.

  @Prop({ default: true })
  status: boolean; // true = Activo / false = Inactivo -> Controla si el proveedor puede recibir órdenes.

  // --- CAMPOS PARA EL ALGORITMO DE RANKING (NORMALIZADOS DE 0 A 1) ---

  @Prop({ default: 0 })
  rating: number; 
  // Hp: Puntaje Histórico (0-5). Promedio de Calidad + Puntualidad. 
  // Ej: 4.8 (Un proveedor muy confiable).

  @Prop({ default: 0 })
  total_orders: number; 
  // Volumen total de transacciones con Estilos Boom.
  // Ej: 25 (Usado como base para calcular porcentajes de éxito).

  @Prop({ default: 0 })
  on_time_delivery_rate: number; 
  // Parte de Hp: Porcentaje de entregas sin retraso (0-100).
  // Ej: 95.5 (Solo el 4.5% de sus órdenes llegaron tarde).

  @Prop({ default: 0 })
  specialization_score: number; 
  // Ep: Nivel de experto en la categoría actual (0-1).
  // Ej: 0.9 (Si casi todas sus ventas son de la categoría que estás consultando).

  @Prop({ default: 0 })
  incidence_rate: number; 
  // Lp: Tasa de reclamos o errores (0-1). 
  // Ej: 0.05 (Solo un 5% de sus productos tuvieron fallas). Se usa como (1 - 0.05).

  @Prop({ default: 0 })
  price_score: number; 
  // 1 - Pp: Competitividad de precio frente al mercado (0-1).
  // Ej: 0.85 (Significa que es uno de los proveedores más económicos).

  @Prop({ default: 0 })
  final_rating: number; 
  // Resultado de la Fórmula Maestra: 0.84 (Puntuación global para toma de decisiones).
  // Es el valor por el cual ordenas tu lista de "Mejores Proveedores".
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
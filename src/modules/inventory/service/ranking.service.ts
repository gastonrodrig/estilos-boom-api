import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseOrder, PurchaseOrderDocument } from '../schema/purchaseOrder.schema';
import { Supplier,SupplierDocument } from 'src/modules/supplier/schema/supplier.schema';
import { OrderStatus } from '../enum/supply.constants';

@Injectable()
export class RankingService {
  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
  ) {}

  /**
   * Recalcula el ranking de un proveedor basado en su historial
   * Criterios: Puntualidad (On-time delivery) y Volumen de órdenes
   */
  async updateSupplierRanking(supplierId: string): Promise<void> {
    const orders = await this.poModel.find({
      id_supplier: supplierId,
      status: OrderStatus.RECEIVED,
      // Solo tomamos órdenes que tengan calificación de calidad para el ranking
      quality_rating: { $exists: true } 
    }).exec();

    if (orders.length === 0) return;

    let onTimeOrders = 0;
    let totalQualityScore = 0;
    
    orders.forEach(order => {
      // 1. Lógica de Puntualidad
      if (order.delivery_date_actual && order.delivery_date_estimated) {
        if (order.delivery_date_actual <= order.delivery_date_estimated) {
          onTimeOrders++;
        }
      }
      
      // 2. Acumular Calidad (usamos el campo que agregamos al Schema)
      totalQualityScore += (order.quality_rating || 0);
    });

    const totalOrders = orders.length;
    
    // Cálculos de tasas
    const onTimeRate = (onTimeOrders / totalOrders) * 100;
    const avgQuality = totalQualityScore / totalOrders; // Promedio de 1 a 5

    /**
     * ALGORITMO PONDERADO (0-5 estrellas)
     * Transformamos la tasa de puntualidad (0-100) a escala 0-5 -> (onTimeRate / 20)
     * Luego aplicamos pesos: 50% cada uno
     */
    const punctualityScore = (onTimeRate / 100) * 5;
    const finalRating = (punctualityScore * 0.5) + (avgQuality * 0.5);

    // Actualizar el perfil del proveedor
    await this.supplierModel.findByIdAndUpdate(supplierId, {
      rating: Number(finalRating.toFixed(2)),
      total_orders: totalOrders,
      on_time_delivery_rate: Number(onTimeRate.toFixed(2))
    });
  }

  /**
   * Sugiere proveedores activos con mejor desempeño
   */
  async getTopSuppliers(limit: number = 5) {
    return this.supplierModel.find({ status: true })
      .sort({ rating: -1, on_time_delivery_rate: -1 })
      .limit(limit)
      .exec();
  }
}
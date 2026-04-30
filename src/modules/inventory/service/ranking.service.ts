import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseOrder, PurchaseOrderDocument } from '../schema/purchaseOrder.schema';
import { Supplier, SupplierDocument } from 'src/modules/supplier/schema/supplier.schema';
import { ProductVariant, ProductVariantDocument } from 'src/modules/product/schemas';
import { OrderStatus } from '../enum/supply.constants';

@Injectable()
export class RankingService {
  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(ProductVariant.name) private variantModel: Model<ProductVariantDocument>,
  ) {}

  /**
   * ACTUALIZACIÓN DE H_p (Puntaje Histórico)
   * Se ejecuta automáticamente al recibir una orden.
   */
  async updateSupplierRanking(supplierId: string): Promise<void> {
    const orders = await this.poModel.find({
      id_supplier: supplierId,
      status: OrderStatus.RECEIVED,
      quality_rating: { $exists: true } 
    }).exec();

    if (orders.length === 0) return;

    let onTimeOrders = 0;
    let totalQualityScore = 0;
    let totalIncidences = 0;
    
    orders.forEach(order => {
      // 1. Puntualidad
      if (order.delivery_date_actual && order.delivery_date_estimated) {
        if (order.delivery_date_actual <= order.delivery_date_estimated) {
          onTimeOrders++;
        }
      }
      
      // 2. Calidad
      totalQualityScore += (order.quality_rating || 0);

      // 3. Incidencias (Consideramos incidencia si la calidad es <= 2)
      if (order.quality_rating <= 2) totalIncidences++;
    });

    const totalOrders = orders.length;
    const onTimeRate = (onTimeOrders / totalOrders) * 100;
    const avgQuality = totalQualityScore / totalOrders;

    // Cálculo de Hp (escala 0-5)
    const punctualityScore = (onTimeRate / 100) * 5;
    const historicalRating = (punctualityScore * 0.5) + (avgQuality * 0.5);

    // Actualizamos los campos base del proveedor
    await this.supplierModel.findByIdAndUpdate(supplierId, {
      rating: Number(historicalRating.toFixed(2)),
      total_orders: totalOrders,
      on_time_delivery_rate: Number(onTimeRate.toFixed(2)),
      incidence_rate: Number((totalIncidences / totalOrders).toFixed(2))
    });
  }

  /**
   * ALGORITMO DE DECISIÓN MULTICRITERIO
   * Calcula el puntaje final (0 a 1) para un proceso de compra específico.
   */
  async calculateGlobalRanking(supplierId: string, variantId: string, currentQuotePrice: number): Promise<number> {
    const supplier = await this.supplierModel.findById(supplierId);
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');

    // 1. Definición de Pesos (Estrategia de Negocio)
    const weights = { w1: 0.4, w2: 0.2, w3: 0.2, w4: 0.2 };

    // 2. H_p (Normalizado 0-1)
    const hp = supplier.rating / 5; //correcto

    // 3. E_p (Especialidad en la categoría de la variante)
    const ep = await this.getSpecializationScore(supplierId, variantId); 

    // 4. L_p (Tasa de incidencias ya guardada)
    const lp = supplier.incidence_rate || 0;

    // 5. P_p (Precio Relativo Normalizado Min-Max)
    const pp = await this.calculatePriceNormalized(variantId, currentQuotePrice);

    // 6. APLICACIÓN DE LA FÓRMULA MAESTRA
    // Puntaje = w1*Hp + w2*Ep + w3*(1-Lp) + w4*(1-Pp)
    const finalScore = 
      (weights.w1 * hp) + 
      (weights.w2 * ep) + 
      (weights.w3 * (1 - lp)) + 
      (weights.w4 * (1 - pp));

    // Guardamos el último ranking calculado para referencia
    await this.supplierModel.findByIdAndUpdate(supplierId, { final_rating: Number(finalScore.toFixed(4)) });

    return Number(finalScore.toFixed(4));
  }

  // --- MÉTODOS AUXILIARES DE CÁLCULO ---

  private async getSpecializationScore(supplierId: string, variantId: string): Promise<number> {
    const variant = await this.variantModel.findById(variantId).populate('id_product');
    if (!variant || !variant.id_product) return 0;

    const categoryId = (variant.id_product as any).id_category;

    const totalSupplierOrders = await this.poModel.countDocuments({ id_supplier: supplierId });
    if (totalSupplierOrders === 0) return 0;

    // Contamos órdenes que contienen productos de la misma categoría
    const categoryOrders = await this.poModel.countDocuments({
      id_supplier: supplierId,
      'items.id_variant': variantId // Simplificación: podrías buscar todas las variantes de esa categoría
    });

    return categoryOrders / totalSupplierOrders;
  }

  private async calculatePriceNormalized(variantId: string, currentPrice: number): Promise<number> {
    // Buscamos en el histórico de todas las OCs recibidas para esa variante
    const history = await this.poModel.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.id_variant': variantId, status: OrderStatus.RECEIVED } },
      { $group: { 
          _id: null, 
          minPrice: { $min: '$items.unit_cost' }, 
          maxPrice: { $max: '$items.unit_cost' } 
      }}
    ]);

    if (history.length === 0) return 0.5; // Si no hay historia, neutral

    const { minPrice, maxPrice } = history[0];
    
    if (maxPrice === minPrice) return 0.5;

    // Aplicamos Min-Max
    const normalized = (currentPrice - minPrice) / (maxPrice - minPrice);
    return Math.max(0, Math.min(1, normalized)); // Asegurar rango 0-1
  }

  async getTopSuppliersForPurchase(variantId: string, limit: number = 5) {
    // Esta lógica podría extenderse para comparar múltiples proveedores antes de elegir uno
    return this.supplierModel.find({ status: true })
      .sort({ final_rating: -1 })
      .limit(limit)
      .exec();
  }
}
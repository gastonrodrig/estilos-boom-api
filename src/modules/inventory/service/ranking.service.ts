import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseOrder, PurchaseOrderDocument } from '../schema/purchaseOrder.schema';
import { Supplier, SupplierDocument } from 'src/modules/supplier/schema/supplier.schema';
import { ProductVariant, ProductVariantDocument } from 'src/modules/product/schemas';
import { OrderStatus } from '../enum/supply.constants';
import { PrePurchaseOrder, PrePurchaseOrderDocument, SupplierQuote } from '../schema/prepurchaseOrder.schema';

@Injectable()
export class RankingService {
  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(ProductVariant.name) private variantModel: Model<ProductVariantDocument>,
    @InjectModel(PrePurchaseOrder.name) private preOrderModel: Model<PrePurchaseOrderDocument>
  ) {}

  /**
   * ACTUALIZACIÓN DE H_p (Puntaje Histórico)
   * Se ejecuta automáticamente al recibir una orden.
   */
  async updateRanking(agentId: string): Promise<void> {
    const model = this.supplierModel;
    
    const query: any = {
      status: OrderStatus.RECEIVED,
      quality_rating: { $exists: true },
      id_supplier: agentId
    };

    const orders = await this.poModel.find(query).exec();
    if (orders.length === 0) return;

    let onTimeOrders = 0;
    let totalQualityScore = 0;
    let totalIncidences = 0;
    
    orders.forEach(order => {
      if (order.delivery_date_actual && order.delivery_date_estimated) {
        if (order.delivery_date_actual <= order.delivery_date_estimated) {
          onTimeOrders++;
        }
      }
      totalQualityScore += (order.quality_rating || 0);
      if (order.quality_rating <= 2) totalIncidences++;
    });

    const totalOrders = orders.length;
    const onTimeRate = (onTimeOrders / totalOrders) * 100;
    const avgQuality = totalQualityScore / totalOrders;
    const punctualityScore = (onTimeRate / 100) * 5;
    const historicalRating = (punctualityScore * 0.5) + (avgQuality * 0.5);

    await model.findByIdAndUpdate(agentId, {
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
  async calculateGlobalRanking(agentId: string, variantId: string, currentQuotePrice: number): Promise<number> {
    const model = this.supplierModel;
    const agent = await model.findById(agentId);
    if (!agent) throw new NotFoundException('Agente no encontrado');

    // 1. Pesos
    const weights = { w1: 0.4, w2: 0.2, w3: 0.2, w4: 0.2 };

    // 2. Hp
    const hp = (agent as any).rating / 5;

    // 3. Ep
    const ep = await this.getSpecializationScore(agentId, variantId); 

    // 4. Lp
    const lp = (agent as any).incidence_rate || 0;

    // 5. Pp
    const pp = await this.calculatePriceNormalized(variantId, currentQuotePrice);

    // 6. Fórmula
    const finalScore = 
      (weights.w1 * hp) + 
      (weights.w2 * ep) + 
      (weights.w3 * (1 - lp)) + 
      (weights.w4 * (1 - pp));

    await model.findByIdAndUpdate(agentId, { final_rating: Number(finalScore.toFixed(4)) });

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

  async convertToPurchaseOrder(preOrderId: string, winnerSupplierId: string): Promise<PurchaseOrder> {
  // 1. Buscar la Pre-Orden
  const preOrder = await this.preOrderModel.findById(preOrderId).exec();
  if (!preOrder) throw new NotFoundException('Pre-Orden no encontrada');

  // 2. Encontrar la cotización ganadora dentro de la Pre-Orden
  const winnerQuote = preOrder.quotes.find(
    q => q.id_agent.toString() === winnerSupplierId
  );
  if (!winnerQuote) throw new BadRequestException('El proveedor seleccionado no tiene una cotización en esta orden');

  // 3. Crear la Orden de Compra final (Tu modelo original)
  const newPurchaseOrder = new this.poModel({
    order_number: `OC-${Date.now().toString().slice(-6)}`,
    id_supplier: winnerSupplierId,
    id_worker: preOrder.id_worker,
    items: winnerQuote.items, // Usamos los precios que el ganador ofreció
    total_amount: winnerQuote.total_amount,
    status: 'PENDIENTE',
    notes: `Generada desde la Pre-Orden ${preOrder.pre_order_number}`
  });

  // 4. Actualizar estado de la Pre-Orden y de la cotización
  preOrder.status = 'CONVERTIDA';
  winnerQuote.quote_status = 'SELECCIONADO';
  await preOrder.save();

  return newPurchaseOrder.save();
}
async rankQuotes(variantId: string, quotes: SupplierQuote[]): Promise<SupplierQuote[]> {
    const rankedQuotes = await Promise.all(
      quotes.map(async (quote) => {
        const score = await this.calculateGlobalRanking(
          quote.id_agent.toString(),
          variantId,
          quote.total_amount / quote.items[0].quantity // Precio unitario promedio
        );
        
        return {
          ...quote,
          ranking_score: score
        };
      })
    );

    // Ordenar de mejor score (1.0) a peor (0.0)
    return rankedQuotes.sort((a, b) => b.ranking_score - a.ranking_score);
  }
}
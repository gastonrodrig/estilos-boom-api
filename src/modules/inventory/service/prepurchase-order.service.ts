import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrePurchaseOrder, PrePurchaseOrderDocument, SupplierQuote } from '../schema/prepurchaseOrder.schema';
import { RankingService } from './ranking.service';
import { PurchaseOrdersService } from './purchase-orders.service';

@Injectable()
export class PrePurchaseOrdersService {
  constructor(
    @InjectModel(PrePurchaseOrder.name) private preOrderModel: Model<PrePurchaseOrderDocument>,
    private readonly rankingService: RankingService,
    private readonly poService: PurchaseOrdersService,
  ) {}

  /**
   * 1. CREACIÓN: Inicia la solicitud de cotización
   */
  async create(createDto: any): Promise<PrePurchaseOrder> {
    const { base_items, supplier_ids, id_worker } = createDto;

    const initialQuotes: SupplierQuote[] = supplier_ids.map(id => ({
      id_supplier: id,
      items: base_items.map(item => ({ ...item, unit_cost: 0 })),
      total_amount: 0,
      ranking_score: 0,
      quote_status: 'PENDIENTE'
    }));

    const preOrder = new this.preOrderModel({
      pre_order_number: `OPP-${Date.now().toString().slice(-6)}`,
      id_worker,
      base_items,
      quotes: initialQuotes,
      status: 'SOLICITANDO'
    });

    return preOrder.save();
  }

  /**
   * 2. CARGAR COTIZACIÓN
   */
  async updateSupplierQuote(preOrderId: string, supplierId: string, updatedItems: any[]): Promise<PrePurchaseOrder> {
    const preOrder = await this.preOrderModel.findById(preOrderId);
    if (!preOrder) throw new NotFoundException('Orden de precompra no encontrada');

    const quoteIndex = preOrder.quotes.findIndex(q => q.id_supplier.toString() === supplierId);
    if (quoteIndex === -1) throw new BadRequestException('El proveedor no está invitado a esta precompra');

    const totalAmount = updatedItems.reduce((acc, it) => acc + (it.quantity * it.unit_cost), 0);

    preOrder.quotes[quoteIndex].items = updatedItems;
    preOrder.quotes[quoteIndex].total_amount = totalAmount;

    const mainVariantId = updatedItems[0].id_variant.toString();
    const unitPrice = updatedItems[0].unit_cost;

    preOrder.quotes[quoteIndex].ranking_score = await this.rankingService.calculateGlobalRanking(
      supplierId,
      mainVariantId,
      unitPrice
    );

    preOrder.status = 'COMPARANDO';
    const updatedOrder = await preOrder.save();
    return await this.preOrderModel.findById(updatedOrder._id)
    .populate('quotes.id_supplier')
    .populate('quotes.items.id_variant')
    .populate({
      path: 'base_items.id_variant',
      populate: { path: 'id_product' },
    })
    .exec();
  }

  /**
   * 3. SELECCIONAR GANADOR
   */
  async selectWinnerAndConvert(
  preOrderId: string, 
  winnerSupplierId: string, 
  deliveryDate: string // 👈 Asegúrate de recibirlo como string desde el controlador
): Promise<any> {
  const preOrder = await this.preOrderModel.findById(preOrderId);
  if (!preOrder) throw new NotFoundException('Orden de precompra no encontrada');
  if (preOrder.status === 'CONVERTIDA') throw new BadRequestException('Esta orden ya fue cerrada');

  const winnerQuote = preOrder.quotes.find(q => q.id_supplier.toString() === winnerSupplierId);
  if (!winnerQuote) throw new BadRequestException('Cotización no encontrada');

  const purchaseOrder = await this.poService.create({
    id_pre_purchase_order: preOrder._id.toString(), 
    order_number: `OC-${Date.now().toString().slice(-6)}`, 
    id_supplier: winnerSupplierId,
    id_worker: preOrder.id_worker.toString(),
    items: winnerQuote.items.map(it => ({
      id_variant: it.id_variant.toString(),
      quantity: Number(it.quantity),
      unit_cost: Number(it.unit_cost)
    })),
    total_amount: winnerQuote.total_amount,
    // 🔥 CORRECCIÓN: Pasa el string directamente, TS dejará de quejarse
    delivery_date_estimated: deliveryDate, 
    notes: `Generada desde la Pre-Orden ${preOrder.pre_order_number}`
  });

    preOrder.id_purchase_order = (purchaseOrder as any)._id;
    preOrder.status = 'CONVERTIDA';
    winnerQuote.quote_status = 'SELECCIONADO';
  await preOrder.save();

  return {
        message: 'Orden de compra generada con éxito',
        // Devolvemos la pre-orden actualizada para que Redux tenga el ID
        prePurchaseOrder: await this.preOrderModel.findById(preOrderId).populate('id_purchase_order')
    };
}

  /**
   * 4. LISTAR TODAS (Nuevos métodos agregados)
   */
  async findAll() {
  return this.preOrderModel
    .find()
    .populate('quotes.id_supplier')
    .populate('id_purchase_order') 
    .populate('id_worker')
    // ✅ AGREGA ESTA LÍNEA para poblar la variante dentro de las cotizaciones
    .populate('quotes.items.id_variant') 
    .populate({
      path: 'base_items.id_variant',
      populate: { path: 'id_product' },
    })
    .sort({ created_at: -1 })
    .exec();
}

  /**
   * 5. OBTENER UNA POR ID
   */
  async findOne(id: string): Promise<PrePurchaseOrder> {
    const preOrder = await this.preOrderModel.findById(id)
      .populate('quotes.id_supplier')
      .populate('id_worker')
      .populate('base_items.id_variant')
      .exec();
    
    if (!preOrder) throw new NotFoundException('Orden de precompra no encontrada');
    return preOrder;
  }
  
}
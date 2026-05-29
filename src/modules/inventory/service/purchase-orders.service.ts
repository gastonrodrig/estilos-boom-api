import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { PurchaseOrder, PurchaseOrderDocument } from '../schema';
import { ProductVariant, ProductVariantDocument } from 'src/modules/product/schemas'; 
import { CreatePurchaseOrderDto, UpdateOrderStatusDto } from '../dto';
import { OrderStatus } from '../enum/supply.constants';
import { SuppliersService } from 'src/modules/supplier/service/suppliers.service';
import { RankingService } from './ranking.service';
import { PrePurchaseOrder, PrePurchaseOrderDocument } from '../schema/prepurchaseOrder.schema';
import { InventoryService } from './inventory.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(ProductVariant.name) private variantModel: Model<ProductVariantDocument>,
    private readonly inventoryService: InventoryService,
    @InjectConnection() private readonly connection: Connection, 
    private readonly supplierService: SuppliersService, 
    private readonly rankingService: RankingService, 
    @InjectModel(PrePurchaseOrder.name) private preOrderModel: Model<PrePurchaseOrderDocument>, 
  ) {}

  // 1. Crear una nueva Orden de Compra (Estado Inicial: PENDIENTE)
  async create(createPoDto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const newOrder = new this.poModel({
      ...createPoDto,
      status: OrderStatus.PENDING,
    });
    return newOrder.save();
  }

  // 2. Gestión de Lógica de Estados (El núcleo del módulo)
  async updateStatus(id: string, updateStatusDto: UpdateOrderStatusDto): Promise<PurchaseOrder> {
    const { status, delivery_date_actual, quality_rating, shipping_cost } = updateStatusDto;
    const order = await this.poModel.findById(id);
    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.status === OrderStatus.RECEIVED) throw new BadRequestException('La orden ya fue procesada.');

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      if (status === OrderStatus.RECEIVED) {
        // 1. Procesamos stock mediante el nuevo flujo unificado de documentos
        await this.handleStockReceipt(order, updateStatusDto.id_worker_receiver, session);
        
        // 2. Actualizamos los datos en el objeto 'order'
        order.delivery_date_actual = delivery_date_actual ? new Date(delivery_date_actual) : new Date();
        order.quality_rating = quality_rating;
        order.shipping_cost = shipping_cost;
      }

      order.status = status;
      const savedOrder = await order.save({ session }); 
      
      // 3. CONFIRMAMOS LA TRANSACCIÓN
      await session.commitTransaction(); 
      session.endSession(); 

      // 4. Actualización del ranking
      if (status === OrderStatus.RECEIVED) {
        await this.rankingService.updateRanking(order.id_supplier.toString());
      }

      return savedOrder;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // 3. Función Privada: Adaptada para interactuar con la nueva lógica unificada de Almacén
  private async handleStockReceipt(order: PurchaseOrderDocument, workerId: string, session: ClientSession) {
    const centralWarehouse = await this.connection.model('Warehouse').findOne(
      { code: 'ALM-CEN' } // Buscamos por código que es más seguro que por nombre largo
    ).session(session).exec();

    if (!centralWarehouse) {
      throw new InternalServerErrorException(
        'Error crítico: El Almacén Central (ALM-CEN) no está inicializado en el sistema.'
      );
    }

    // Distribución controlada de mermas/incidencias sobre los ítems
    let remainingIncidences = order.qty_incidences || 0;
    const documentItems = [];

    for (const item of order.items) {
      const totalOrderedQty = Number(item.quantity);
      let netConformingQty = totalOrderedQty;
      let incidenceNote = '';

      if (remainingIncidences > 0) {
        if (remainingIncidences >= netConformingQty) {
          remainingIncidences -= netConformingQty;
          netConformingQty = 0; 
          incidenceNote = `Lote completo de la variante llegó dañado en revisión de calidad.`;
        } else {
          netConformingQty -= remainingIncidences;
          incidenceNote = `${remainingIncidences} unidades llegaron dañadas en control de calidad.`;
          remainingIncidences = 0;
        }
      }

      documentItems.push({
        id_variant: item.id_variant,
        quantity_expected: totalOrderedQty,
        quantity_received: netConformingQty,
        incidence_note: incidenceNote
      });
    }

    // 🚀 GENERACIÓN DEL DOCUMENTO DE INGRESO UNIFICADO
    // Creamos el WarehouseDocument correspondiente a la recepción física de mercadería
    const warehouseDoc = await this.inventoryService.createWarehouseDocument({
      document_number: `REC-${order.order_number}`, // Correlativo asociado a la OC
      type: 'INGRESO_COMPRA',
      status: 'PENDIENTE',
      id_source_warehouse: null, // Viene de un proveedor externo
      id_target_warehouse: String(centralWarehouse._id), // Ingresa a nuestro Almacén Central
      id_origin_doc: String(order._id),
      id_sender_worker: workerId || String(order.id_worker),
      notes: `Ingreso generado automáticamente por conformidad de la Orden de Compra ${order.order_number}`,
      items: documentItems
    });

    // 🛠️ PROCESAMIENTO AUTOMÁTICO DE LOS INVENTARIOS (Afecta Stock y Kárdex)
    // Invocamos el método del servicio de inventarios que centraliza y mitiga errores matemáticos
    await this.inventoryService.processWarehouseDocument(
      String(warehouseDoc._id),
      workerId || String(order.id_worker),
      documentItems.map(i => ({
        id_variant: String(i.id_variant),
        quantity_received: i.quantity_received,
        incidence_note: i.incidence_note
      }))
    );
  }

  // 4. Listar órdenes (con filtros opcionales)
  async findAll() {
    return this.poModel.find().populate('id_supplier').populate('id_worker').exec();
  }

  async findOne(id: string) {
    return this.poModel.findById(id)
      .populate('id_supplier')
      .populate({
        path: 'items.id_variant',
        populate: { path: 'id_product' } 
      })
      .exec();
  }

  async startQualityCheck(purchaseOrderId: string, preOrderId: string) {
    await this.poModel.findByIdAndUpdate(
      purchaseOrderId, 
      { status: 'EN_REVISION' }, 
      { returnDocument: 'after' } 
    );

    const updatedPreOrder = await this.preOrderModel.findByIdAndUpdate(
      preOrderId,
      { status: 'EN_REVISION' }, 
      { new: true } 
    )
    .populate('id_purchase_order')
    .populate('id_worker')
    .populate('quotes.id_agent');

    if (!updatedPreOrder) {
       throw new NotFoundException('Pre-Orden no encontrada en la base de datos.');
    }

    return { prePurchaseOrder: updatedPreOrder };
  }

  async extendDeliveryDate(purchaseOrderId: string, newDate: string, reason: string) {
    const order = await this.poModel.findById(purchaseOrderId);
    if (!order) throw new NotFoundException('Orden no encontrada');

    const extensionNote = `\n[EXTENSIÓN ${new Date().toLocaleDateString()}]: ${reason}`;
    const updatedNotes = order.notes ? order.notes + extensionNote : extensionNote;

    await this.poModel.findByIdAndUpdate(
      purchaseOrderId,
      { 
        delivery_date_estimated: new Date(newDate),
        notes: updatedNotes 
      },
      { returnDocument: 'after' }
    );

    const updatedPreOrder = await this.preOrderModel.findOne({ id_purchase_order: purchaseOrderId })
      .populate('id_purchase_order')
      .populate('id_worker')
      .populate('quotes.id_agent');

    return { prePurchaseOrder: updatedPreOrder };
  }

  async approveAndInventory(
    purchaseOrderId: string, 
    qualityRating: number, 
    workerId: string,
    observations?: string,    
    qtyIncidences?: number    
  ): Promise<any> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const order = await this.poModel.findById(purchaseOrderId);
      if (!order) throw new NotFoundException('Orden de Compra no encontrada');
      if (order.status === 'COMPLETADA') throw new BadRequestException('Esta orden ya fue ingresada al inventario.');

      order.status = 'COMPLETADA'; 
      order.quality_rating = qualityRating;
      order.delivery_date_actual = new Date();
      order.qty_incidences = qtyIncidences || 0; 
      order.quality_observations = observations || 'Sin observaciones adicionales.'; 
      
      const savedOrder = await order.save({ session });

      // Se ejecuta el receptor unificado de stock
      await this.handleStockReceipt(savedOrder, workerId, session);

      const updatedPreOrder = await this.preOrderModel.findOneAndUpdate(
        { id_purchase_order: new Types.ObjectId(purchaseOrderId) },
        { status: 'COMPLETADA' },
        { session, new: true }
      )
      .populate('id_purchase_order')
      .populate('id_worker')
      .populate('quotes.id_agent');

      if (!updatedPreOrder) {
          throw new BadRequestException('No se pudo encontrar la Pre-Orden vinculada para cerrar el flujo.');
      }

      await session.commitTransaction();
      session.endSession();

      await this.rankingService.updateRanking(order.id_supplier.toString());

      return {
        message: 'Mercadería integrada con éxito, mermas auditadas y ranking actualizado.',
        prePurchaseOrder: updatedPreOrder
      };

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
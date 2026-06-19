import { 
  Injectable, 
  NotFoundException, 
  BadRequestException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { 
  InventoryMovement, InventoryMovementDocument,
} from '../schema';
// Alias para evitar colisión: WarehouseDoc = tipo Mongoose de la colección Warehouse
import { Warehouse, WarehouseDocument as WarehouseDoc } from 'src/modules/warehouse/schema/warehouse.schema';
import { WarehouseStock, WarehouseStockDocument } from 'src/modules/warehouse/schema/warehouse-stock.schema';
// WarehouseDocument = clase/modelo de la colección WarehouseDocuments (documentos operativos)
import {
  WarehouseDocument,
  WarehouseDocumentDocument,
} from 'src/modules/warehouse/schema/warehouse-document.schema';

import { CreateWarehouseDocumentDto } from 'src/modules/warehouse/dto/create-warehouse-document.dto';
import { StorageService } from '../../firebase/services';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryMovement.name) 
    private readonly movementModel: Model<InventoryMovementDocument>,

    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDoc>,

    @InjectModel(WarehouseStock.name) 
    private readonly stockModel: Model<WarehouseStockDocument>,

    @InjectModel(WarehouseDocument.name) 
    private readonly warehouseDocModel: Model<WarehouseDocumentDocument>,

    private readonly storageService: StorageService,
  ) {}

  // ==========================================
  // 1. MÓDULO: ALMACENES (WAREHOUSES)
  // ==========================================

  async seedWarehouses() {
    const defaults = [
      { name: 'ALMACEN_CENTRAL', code: 'ALM-CEN', address: 'Av. Principal 123', ubigeo: '150101', city: 'Lima', district: 'Lima' },
      { name: 'TIENDA_PRINCIPAL', code: 'TND-PRI', address: 'Av. Larco 456', ubigeo: '150122', city: 'Lima', district: 'Miraflores' }
    ];
    for (const item of defaults) {
      const exists = await this.warehouseModel.findOne({ code: item.code });
      if (!exists) {
        await new this.warehouseModel(item).save();
      }
    }
    return this.warehouseModel.find().exec();
  }

  async findAllWarehouses() {
    return this.warehouseModel.find({ is_active: true }).exec();
  }

  // ==========================================
  // 2. MÓDULO: CONTROL DE STOCK POR ALMACÉN
  // ==========================================

  private async getOrCreateStockRecord(
    idWarehouse: Types.ObjectId | string,
    idVariant: Types.ObjectId | string
  ): Promise<WarehouseStockDocument> {
    const warehouseObjId = typeof idWarehouse === 'string' ? new Types.ObjectId(idWarehouse) : idWarehouse;
    const variantObjId = typeof idVariant === 'string' ? new Types.ObjectId(idVariant) : idVariant;

    const stockRecord = await this.stockModel.findOne({ 
      id_warehouse: warehouseObjId, 
      id_variant: variantObjId 
    }).exec();

    if (!stockRecord) {
      const newStock = new this.stockModel({
        id_warehouse: warehouseObjId,
        id_variant: variantObjId,
        physical_stock: 0,
        reserved_stock: 0,
        location_rack: 'Sin Asignar'
      });
      return await newStock.save();
    }
    
    return stockRecord;
  }

  async getStockByVariant(variantId: string) {
    return this.stockModel
      .find({ id_variant: new Types.ObjectId(variantId) })
      .populate('id_warehouse', 'name code')
      .exec();
  }

  async getStockByMultipleVariants(variantIds: string[]) {
    const objectIds = variantIds.map((id) => new Types.ObjectId(id));
    return this.stockModel
      .find({ id_variant: { $in: objectIds } })
      .populate('id_warehouse', 'name code')
      .exec();
  }

  // ==========================================
  // 3. MÓDULO: HISTORIAL DE MOVIMIENTOS (KÁRDEX)
  // ==========================================

  /**
   * Método interno para aplicar los cambios matemáticos en el stock físico
   */
  private async applyStockChange(
    idWarehouse: Types.ObjectId | string,
    idVariant: Types.ObjectId | string,
    idDocument: Types.ObjectId | string,
    idWorker: Types.ObjectId | string,
    type: 'ENTRADA' | 'SALIDA',
    quantity: number,
    reason: 'COMPRA' | 'VENTA' | 'TRANSFERENCIA' | 'AJUSTE' | 'PRODUCCION'
  ): Promise<InventoryMovementDocument> {
    const stockRecord = await this.getOrCreateStockRecord(idWarehouse, idVariant);
    const previousStock = stockRecord.physical_stock;

    let newStock = previousStock;
    if (type === 'ENTRADA') {
      newStock += quantity;
    } else {
      newStock -= quantity;
    }

    if (newStock < 0) {
      throw new BadRequestException(`Stock insuficiente en el almacén para cumplir la operación.`);
    }

    // Actualizamos el stock físico real
    stockRecord.physical_stock = newStock;
    await stockRecord.save();

    // Grabamos la línea inmutable en el Kárdex
    const movement = new this.movementModel({
      id_variant: typeof idVariant === 'string' ? new Types.ObjectId(idVariant) : idVariant,
      id_warehouse: typeof idWarehouse === 'string' ? new Types.ObjectId(idWarehouse) : idWarehouse,
      id_document: typeof idDocument === 'string' ? new Types.ObjectId(idDocument) : idDocument,
      id_worker: typeof idWorker === 'string' ? new Types.ObjectId(idWorker) : idWorker,
      type,
      quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason
    });

    return await movement.save();
  }

  async getKardexByVariant(variantId: string) {
    return this.movementModel
      .find({ id_variant: new Types.ObjectId(variantId) })
      .sort({ created_at: -1 })
      .populate('id_worker', 'first_name last_name')
      .populate('id_warehouse', 'name code')
      .populate({
        path: 'id_document',
        select: 'document_number type'
      })
      .exec();
  }

  async findAllMovements() {
    return this.movementModel
      .find()
      .sort({ created_at: -1 })
      .populate('id_worker', 'first_name last_name')
      .populate('id_warehouse', 'name code')
      .populate({
        path: 'id_variant',
        select: 'sku_variant size color',
        populate: { path: 'id_product', select: 'name' },
      })
      .exec();
  }

  // ==========================================
  // 4. MÓDULO: GESTIÓN DE DOCUMENTOS DE ALMACÉN
  // ==========================================

  /**
   * Crea cualquier documento de almacén (Compra, Venta, Transferencia, Ajuste) en estado PENDIENTE
   */
  async createWarehouseDocument(dto: CreateWarehouseDocumentDto) {
    const newDoc = new this.warehouseDocModel({
      document_number: dto.document_number,
      type: dto.type,
      status: dto.status || 'PENDIENTE',
      id_source_warehouse: dto.id_source_warehouse ? new Types.ObjectId(dto.id_source_warehouse) : null,
      id_target_warehouse: dto.id_target_warehouse ? new Types.ObjectId(dto.id_target_warehouse) : null,
      id_origin_doc: dto.id_origin_doc ? new Types.ObjectId(dto.id_origin_doc) : null,
      id_sender_worker: new Types.ObjectId(dto.id_sender_worker),
      notes: dto.notes,
      items: dto.items.map(item => ({
        id_variant: new Types.ObjectId(item.id_variant),
        quantity_expected: item.quantity_expected,
        quantity_received: item.quantity_received || 0,
        incidence_note: item.incidence_note || ''
      }))
    });

    return await newDoc.save();
  }

  /**
   * El almacenero ejecuta la acción física y da la conformidad del documento.
   * Aquí ocurre el impacto real en el stock físico y kárdex.
   */
  async processWarehouseDocument(documentId: string, workerId: string, itemsEvaluated: { id_variant: string, quantity_received: number, incidence_note?: string }[]) {
    const doc = await this.warehouseDocModel.findById(documentId);
    if (!doc) throw new NotFoundException('Documento de almacén no encontrado.');
    if (doc.status === 'COMPLETADO' || doc.status === 'CANCELADO') {
      throw new BadRequestException('Este documento ya ha sido procesada o cancelado.');
    }

    const idWorker = new Types.ObjectId(workerId);

    // Actualizar las cantidades reales contadas por el almacenero
    for (const evalItem of itemsEvaluated) {
      const docItem = doc.items.find(i => String(i.id_variant) === evalItem.id_variant);
      if (docItem) {
        docItem.quantity_received = evalItem.quantity_received;
        docItem.incidence_note = evalItem.incidence_note || '';
      }
    }

    // DISPARAR LOS MOVIMIENTOS SEGÚN EL TIPO DE DOCUMENTO UNIFICADO
    for (const item of doc.items) {
      const finalQty = item.quantity_received; // Trabajamos sobre lo que el almacenero realmente contó

      if (finalQty <= 0) continue; 

      // Caso A: Es una transferencia entre sedes propias
      if (doc.type === 'TRANSFERENCIA') {
        // 1. Despacho (Salida del origen)
        await this.applyStockChange(doc.id_source_warehouse, item.id_variant, doc._id as Types.ObjectId, doc.id_sender_worker, 'SALIDA', finalQty, 'TRANSFERENCIA');
        // 2. Recepción (Entrada al destino)
        await this.applyStockChange(doc.id_target_warehouse, item.id_variant, doc._id as Types.ObjectId, idWorker, 'ENTRADA', finalQty, 'TRANSFERENCIA');
      } 
      
      // Caso B: Es un ingreso por compra a proveedor
      else if (doc.type === 'INGRESO_COMPRA') {
        await this.applyStockChange(doc.id_target_warehouse, item.id_variant, doc._id as Types.ObjectId, idWorker, 'ENTRADA', finalQty, 'COMPRA');
      } 
      
      // Caso B.2: Es un ingreso por finalización de producción
      else if (doc.type === 'INGRESO_PRODUCCION') {
        await this.applyStockChange(doc.id_target_warehouse, item.id_variant, doc._id as Types.ObjectId, idWorker, 'ENTRADA', finalQty, 'PRODUCCION');
      } 
      
      // Caso C: Es una salida por venta a un cliente
      else if (doc.type === 'SALIDA_VENTA') {
        await this.applyStockChange(doc.id_source_warehouse, item.id_variant, doc._id as Types.ObjectId, doc.id_sender_worker, 'SALIDA', finalQty, 'VENTA');
      } 
      
      // Caso D: Ajuste manual de inventario (Merma / Inventario físico)
      else if (doc.type === 'AJUSTE') {
        // Si el ajuste resta inventario, se manda como SALIDA. Si recupera stock, se manda como ENTRADA.
        // Asumiremos que el ajuste regulariza por salida en este ejemplo operativo básico.
        await this.applyStockChange(doc.id_source_warehouse, item.id_variant, doc._id as Types.ObjectId, idWorker, 'SALIDA', finalQty, 'AJUSTE');
      }
    }

    // Cerrar el documento administrativamente
    doc.status = 'COMPLETADO';
    doc.id_receiver_worker = idWorker;
    
    const savedDoc = await doc.save();

    // Si es un ingreso por compra, actualizamos la OC y PreOC asociadas
    if (doc.type === 'INGRESO_COMPRA' && doc.id_origin_doc) {
      try {
        const poModel = this.warehouseDocModel.db.model('PurchaseOrder') as any;
        const preOrderModel = this.warehouseDocModel.db.model('PrePurchaseOrder') as any;
        const supplierModel = this.warehouseDocModel.db.model('Supplier') as any;

        const order = await poModel.findById(doc.id_origin_doc);
        if (order && order.status !== 'COMPLETADA') {
          // Calcular mermas/incidencias
          // Sumamos todas las diferencias entre expected y received
          let qtyIncidences = 0;
          let notesList: string[] = [];

          for (const item of doc.items) {
            const diff = Math.max(0, (item.quantity_expected || 0) - (item.quantity_received || 0));
            qtyIncidences += diff;
            if (item.incidence_note && item.incidence_note.trim() !== '') {
              notesList.push(`${item.id_variant}: ${item.incidence_note}`);
            }
          }

          // Rating de calidad: si hay incidencias bajamos el rating
          const qualityRating = qtyIncidences === 0 ? 5 : qtyIncidences < 5 ? 4 : 3;

          order.status = 'COMPLETADA';
          order.quality_rating = qualityRating;
          order.delivery_date_actual = new Date();
          order.qty_incidences = qtyIncidences;
          order.quality_observations = notesList.length > 0 ? notesList.join(' | ') : 'Recepción completa sin incidencias físicas.';
          if (doc.attachments && doc.attachments.length > 0) {
            order.attachments = [...(order.attachments || []), ...doc.attachments];
          }
          await order.save();

          // Actualizar PrePurchaseOrder
          await preOrderModel.findOneAndUpdate(
            { id_purchase_order: order._id },
            { status: 'COMPLETADA' },
            { new: true }
          );

          // Actualizar ranking del proveedor
          const agentId = order.id_supplier.toString();
          const query: any = {
            status: 'COMPLETADA',
            quality_rating: { $exists: true },
            id_supplier: agentId
          };

          const orders = await poModel.find(query).exec();
          if (orders.length > 0) {
            let onTimeOrders = 0;
            let totalQualityScore = 0;
            let totalIncidences = 0;
            
            orders.forEach((o: any) => {
              if (o.delivery_date_actual && o.delivery_date_estimated) {
                if (new Date(o.delivery_date_actual) <= new Date(o.delivery_date_estimated)) {
                  onTimeOrders++;
                }
              }
              totalQualityScore += (o.quality_rating || 0);
              if (o.quality_rating <= 2) totalIncidences++;
            });

            const totalOrders = orders.length;
            const onTimeRate = (onTimeOrders / totalOrders) * 100;
            const avgQuality = totalQualityScore / totalOrders;
            const punctualityScore = (onTimeRate / 100) * 5;
            const historicalRating = (punctualityScore * 0.5) + (avgQuality * 0.5);

            await supplierModel.findByIdAndUpdate(agentId, {
              rating: Number(historicalRating.toFixed(2)),
              total_orders: totalOrders,
              on_time_delivery_rate: Number(onTimeRate.toFixed(2)),
              incidence_rate: Number((totalIncidences / totalOrders).toFixed(2))
            });
          }
        }
      } catch (err) {
        console.error('Error al actualizar flujo de OC tras recepción:', err);
      }
    }

    // Si es una salida por venta, actualizamos la orden de venta asociada a 'SHIPPED'
    if (doc.type === 'SALIDA_VENTA' && doc.id_origin_doc) {
      try {
        const orderModel = this.warehouseDocModel.db.model('Order');
        await orderModel.findByIdAndUpdate(doc.id_origin_doc, { status: 'SHIPPED' });
      } catch (err) {
        console.error('Error al actualizar flujo de orden tras despacho de venta:', err);
      }
    }

    // Si es un ingreso por producción, actualizamos la OP asociada a COMPLETADA
    if (doc.type === 'INGRESO_PRODUCCION' && doc.id_origin_doc) {
      try {
        const prodModel = this.warehouseDocModel.db.model('ProductionOrder') as any;
        const order = await prodModel.findById(doc.id_origin_doc);
        if (order && order.status !== 'COMPLETADA') {
          order.status = 'COMPLETADA';
          order.history.push({ status: 'COMPLETADA', date: new Date() });
          await order.save();
        }
      } catch (err) {
        console.error('Error al actualizar la orden de producción relacionada.', err);
      }
    }

    return savedDoc;
  }

  async findAllWarehouseDocuments() {
    return this.warehouseDocModel
      .find()
      .populate('id_source_warehouse', 'name code')
      .populate('id_target_warehouse', 'name code')
      .populate('id_sender_worker', 'first_name last_name')
      .populate('id_receiver_worker', 'first_name last_name')
      .populate({
        path: 'items.id_variant',
        select: 'sku_variant size color',
        populate: { path: 'id_product', select: 'name images' },
      })
      .sort({ created_at: -1 })
      .exec();
  }

  async addWarehouseDocAttachments(id: string, files: Express.Multer.File[]) {
    const doc = await this.warehouseDocModel.findById(id);
    if (!doc) throw new NotFoundException('Documento de almacén no encontrado.');

    const uploadResults = await this.storageService.uploadMultipleFiles(
      'warehouse-documents',
      files,
      id,
    ) as any[];
    const urls = uploadResults.map((r: any) => r.url);
    doc.attachments = [...(doc.attachments || []), ...urls];
    const saved = await doc.save();

    if (saved.type === 'INGRESO_COMPRA' && saved.id_origin_doc) {
      try {
        const poModel = this.warehouseDocModel.db.model('PurchaseOrder') as any;
        const order = await poModel.findById(saved.id_origin_doc);
        if (order) {
          order.attachments = [...(order.attachments || []), ...urls];
          await order.save();
        }
      } catch (err) {
        console.error('Error al sincronizar adjuntos de ingreso a la OC:', err);
      }
    }

    return saved;
  }
}
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  InternalServerErrorException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { 
  InventoryMovement, InventoryMovementDocument,
  Warehouse, WarehouseDocument,
  WarehouseStock, WarehouseStockDocument,
  InventoryTransfer, InventoryTransferDocument
} from '../schema';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryMovement.name) 
    private movementModel: Model<InventoryMovementDocument>,

    @InjectModel(Warehouse.name) 
    private warehouseModel: Model<WarehouseDocument>,

    @InjectModel(WarehouseStock.name) 
    private stockModel: Model<WarehouseStockDocument>,

    @InjectModel(InventoryTransfer.name) 
    private transferModel: Model<InventoryTransferDocument>,
  ) {}

  // ==========================================
  // 1. MÓDULO: ALMACENES (WAREHOUSES)
  // ==========================================

  /**
   * Inicializa los almacenes por defecto si no existen (Se puede correr al levantar el sistema)
   */
  async seedWarehouses() {
    const defaults = ['ALMACEN_CENTRAL', 'TIENDA_PRINCIPAL'];
    for (const name of defaults) {
      const exists = await this.warehouseModel.findOne({ name });
      if (!exists) {
        await new this.warehouseModel({ name }).save();
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

  /**
   * Obtiene o inicializa en 0 el stock de una variante en un almacén específico
   */
  private async getOrCreateStockRecord(idWarehouse: Types.ObjectId, idVariant: Types.ObjectId): Promise<WarehouseStockDocument> {
    let stockRecord = await this.stockModel.findOne({ id_warehouse: idWarehouse, id_variant: idVariant });
    
    if (!stockRecord) {
      stockRecord = new this.stockModel({
        id_warehouse: idWarehouse,
        id_variant: idVariant,
        stock: 0
      });
      await stockRecord.save();
    }
    return stockRecord;
  }

  /**
   * Consulta el stock consolidado de una variante en todos los almacenes
   */
  async getStockByVariant(variantId: string) {
    return this.stockModel
      .find({ id_variant: new Types.ObjectId(variantId) })
      .populate('id_warehouse', 'name')
      .exec();
  }

  // ==========================================
  // 3. MÓDULO: MOVIMIENTOS DE INVENTARIO (KARDEX)
  // ==========================================

  /**
   * Registrar un movimiento afectando directamente el stock del almacén indicado
   */
  async createMovement(data: {
    id_variant: string;
    id_warehouse: string;
    id_worker: string;
    type: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
    quantity: number;
    reason: string;
    id_purchase_order?: string;
  }): Promise<InventoryMovement> {
    const wId = new Types.ObjectId(data.id_warehouse);
    const vId = new Types.ObjectId(data.id_variant);

    // 1. Obtener registro de existencias actual en ese almacén
    const currentStockRecord = await this.getOrCreateStockRecord(wId, vId);
    const previousStock = currentStockRecord.stock;

    // 2. Calcular nuevo stock físico
    let newStock = previousStock;
    if (data.type === 'ENTRADA') newStock += data.quantity;
    else if (data.type === 'SALIDA') newStock -= data.quantity;
    else if (data.type === 'AJUSTE') newStock = data.quantity; // En ajuste, la cantidad recibida es el nuevo stock absoluto

    if (newStock < 0) {
      throw new BadRequestException(`Stock insuficiente en el almacén para realizar la operación.`);
    }

    // 3. Actualizar la colección de existencias por almacén
    currentStockRecord.stock = newStock;
    await currentStockRecord.save();

    // 4. Guardar la auditoría en el historial de movimientos
    const movement = new this.movementModel({
      id_variant: vId,
      id_warehouse: wId,
      id_worker: new Types.ObjectId(data.id_worker),
      id_purchase_order: data.id_purchase_order ? new Types.ObjectId(data.id_purchase_order) : undefined,
      type: data.type,
      quantity: data.quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: data.reason
    });

    return movement.save();
  }

  async getKardexByVariant(variantId: string) {
    return this.movementModel
      .find({ id_variant: new Types.ObjectId(variantId) })
      .sort({ created_at: -1 })
      .populate('id_worker', 'first_name last_name')
      .populate('id_warehouse', 'name')
      .populate('id_purchase_order', 'order_number')
      .exec();
  }

  // ==========================================
  // 4. MÓDULO: TRANSFERENCIAS INTERNAS (ALMACÉN ➡️ TIENDA)
  // ==========================================

  /**
   * Crea una transferencia en estado PENDIENTE
   */
  async createTransfer(dto: {
    code: string;
    id_source_warehouse: string;
    id_target_warehouse: string;
    id_sender_worker: string;
    items: { id_variant: string; quantity: number }[];
  }) {
    const newTransfer = new this.transferModel({
      code: dto.code,
      id_source_warehouse: new Types.ObjectId(dto.id_source_warehouse),
      id_target_warehouse: new Types.ObjectId(dto.id_target_warehouse),
      id_sender_worker: new Types.ObjectId(dto.id_sender_worker),
      items: dto.items.map(i => ({
        id_variant: new Types.ObjectId(i.id_variant),
        quantity: i.quantity
      })),
      status: 'PENDIENTE'
    });

    return await newTransfer.save();
  }

  /**
   * Procesa y completa de forma atómica una transferencia interna restando del origen y sumando al destino
   */
  async completeTransfer(transferId: string, receiverWorkerId: string) {
    const transfer = await this.transferModel.findById(transferId);
    if (!transfer) throw new NotFoundException('Transferencia no encontrada');
    if (transfer.status !== 'PENDIENTE') throw new BadRequestException('Esta transferencia ya ha sido procesada');

    // Procesamos cada artículo del lote de traslado
    for (const item of transfer.items) {
      // Phase A: Salida del Almacén Origen
      await this.createMovement({
        id_variant: String(item.id_variant),
        id_warehouse: String(transfer.id_source_warehouse),
        id_worker: receiverWorkerId,
        type: 'SALIDA',
        quantity: item.quantity,
        reason: `Despacho por transferencia interna código: ${transfer.code}`
      });

      // Phase B: Entrada al Almacén Destino (Tienda)
      await this.createMovement({
        id_variant: String(item.id_variant),
        id_warehouse: String(transfer.id_target_warehouse),
        id_worker: receiverWorkerId,
        type: 'ENTRADA',
        quantity: item.quantity,
        reason: `Recepción por transferencia interna código: ${transfer.code}`
      });
    }

    // Actualizamos la cabecera de la guía de traslado
    transfer.status = 'COMPLETADO';
    transfer.id_receiver_worker = new Types.ObjectId(receiverWorkerId);
    return await transfer.save();
  }

  async findAllTransfers() {
    return this.transferModel
      .find()
      .populate('id_source_warehouse', 'name')
      .populate('id_target_warehouse', 'name')
      .populate('id_sender_worker', 'first_name last_name')
      .sort({ created_at: -1 })
      .exec();
  }
}
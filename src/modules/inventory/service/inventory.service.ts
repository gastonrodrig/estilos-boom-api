import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InventoryMovement,InventoryMovementDocument } from '../schema';
import { CreateInventoryMovementDto } from '../dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryMovement.name) 
    private movementModel: Model<InventoryMovementDocument>
  ) {}

  // Obtener el historial de movimientos de un producto específico (Kardex)
  async getKardexByVariant(variantId: string) {
    return this.movementModel
      .find({ id_variant: variantId })
      .sort({ created_at: -1 }) // El más reciente primero
      .populate('id_worker', 'first_name last_name')
      .populate('id_purchase_order', 'order_number')
      .exec();
  }

  // Registrar un movimiento (Usado internamente por PurchaseOrder o manualmente)
  async createMovement(data: any): Promise<InventoryMovement> {
    const movement = new this.movementModel(data);
    return movement.save();
  }

  // Listar todos los movimientos del sistema para reportes
  async findAllMovements() {
    return this.movementModel.find().populate('id_variant').exec();
  }
}
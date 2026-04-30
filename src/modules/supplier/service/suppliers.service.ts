import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier, SupplierDocument } from '../schema/supplier.schema';
import { PurchaseOrder, PurchaseOrderDocument } from 'src/modules/inventory/schema';
import { CreateSupplierDto, UpdateSupplierDto } from '../dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
    @InjectModel(PurchaseOrder.name) private purchaseOrderModel: Model<PurchaseOrderDocument>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Validación manual para dar una respuesta clara al usuario/front
    const existingSupplier = await this.supplierModel.findOne({ ruc: createSupplierDto.ruc });
    if (existingSupplier) {
      throw new BadRequestException('Ya existe un proveedor registrado con este RUC.');
    }

    const createdSupplier = new this.supplierModel(createSupplierDto);
    return createdSupplier.save();
  }

  async findAll(filters?: { search?: string; status?: string | boolean }): Promise<Supplier[]> {
    const query: any = {};

    if (filters?.status !== undefined) {
      query.status = filters.status === 'false' || filters.status === false ? false : true;
    } else {
      query.status = true;
    }

    if (filters?.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [
        { name_company: regex },
        { ruc: regex },
        { contact_person: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    return this.supplierModel
      .find(query)
      .sort({ rating: -1, on_time_delivery_rate: -1 })
      .exec();
  }

  async getRankingSugerido(limit: number = 5): Promise<Supplier[]> {
    return this.supplierModel
      .find({ status: true })
      .sort({ rating: -1 }) // De mayor a menor
      .limit(limit)
      .exec();
  }

  async findOne(id: string): Promise<SupplierDocument> {
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async getFicha(id: string): Promise<{ supplier: SupplierDocument; orders: PurchaseOrder[]; incidences: any[] }> {
    const supplier = await this.findOne(id);

    const orders = await this.purchaseOrderModel
      .find({ id_supplier: supplier._id })
      .populate('id_worker')
      .populate('items.id_variant')
      .exec();

    return {
      supplier,
      orders,
      incidences: [], // Incidencias pendientes de implementar si hay un modelo específico en el futuro
    };
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const updatedSupplier = await this.supplierModel
      .findByIdAndUpdate(id, updateSupplierDto, { new: true })
      .exec();
    if (!updatedSupplier) throw new NotFoundException('Proveedor no encontrado');
    return updatedSupplier;
  }

  async remove(id: string): Promise<any> {
    // Soft Delete: Mantenemos al proveedor en la BD para no romper el historial de compras
    const deleted = await this.supplierModel.findByIdAndUpdate(
      id, 
      { status: false }, 
      { new: true }
    ).exec();
    
    if (!deleted) throw new NotFoundException('Proveedor no encontrado');
    return { success: true, message: 'Proveedor desactivado correctamente' };
  }
}
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workshop, WorkshopDocument } from '../schema/workshop.schema';
import { CreateWorkshopDto, UpdateWorkshopDto } from '../dto';

@Injectable()
export class WorkshopService {
  constructor(
    @InjectModel(Workshop.name) private workshopModel: Model<WorkshopDocument>,
  ) {}

  async create(dto: CreateWorkshopDto): Promise<Workshop> {
    const existing = await this.workshopModel.findOne({ ruc: dto.ruc });
    if (existing) {
      throw new BadRequestException('Ya existe un taller registrado con este RUC.');
    }
    const created = new this.workshopModel(dto);
    return created.save();
  }

  async findAll(filters?: { search?: string; status?: string | boolean }): Promise<Workshop[]> {
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
        { specialty: regex },
      ];
    }

    return this.workshopModel
      .find(query)
      .sort({ created_at: -1 })
      .exec();
  }

  async findOne(id: string): Promise<WorkshopDocument> {
    const workshop = await this.workshopModel.findById(id).exec();
    if (!workshop) throw new NotFoundException('Taller no encontrado');
    return workshop;
  }

  async update(id: string, dto: UpdateWorkshopDto): Promise<Workshop> {
    const updated = await this.workshopModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Taller no encontrado');
    return updated;
  }

  async remove(id: string): Promise<any> {
    const deleted = await this.workshopModel.findByIdAndUpdate(
      id, 
      { status: false }, 
      { new: true }
    ).exec();
    if (!deleted) throw new NotFoundException('Taller no encontrado');
    return { success: true, message: 'Taller desactivado correctamente' };
  }
}

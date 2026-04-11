import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { 
  Workshop, WorkshopDocument
} from '../schemas';
import { Estado, Roles } from 'src/core/constants/app.constants';
import { CreateWorkshopDto } from '../dtos/create-workshop.dto';
import { UpdateWorkshopDto } from '../dtos/update-workshop.dto';


@Injectable()
export class WorkshopService {
  constructor(
    @InjectModel(Workshop.name) 
    private workshopModel: Model<WorkshopDocument>,
  ) { }

  async createClientAdmin(dto: CreateWorkshopDto): Promise<Workshop> {
      const session = await this.workshopModel.db.startSession();
      session.startTransaction();

      try {
        const createdWorkshops = await this.workshopModel.create(
          [
            {
              name: dto.name,
              description: dto.description,
              contact_person: dto.contact_person,
              phone: dto.phone,
              address: dto.address,
              status: Estado.ACTIVO,
            },
          ],
          { session },
        );
  
        const newWorkshop = createdWorkshops[0];

        console.log("Nuevo taller creado:", newWorkshop);
  
        let a = await session.commitTransaction();
        console.log("Transacción confirmada:", a);
        return newWorkshop;
      
      } catch (error) {
        console.error("Error en la transacción:", error);
        await session.abortTransaction();
  
        if (error instanceof HttpException) {
          throw error;
        }
  
        throw new InternalServerErrorException(
          `Error creating workshop: ${error.message}`,
        );
      } finally {
        session.endSession();
      }
    }


   async updateWorkshop(idUser: string, dto: UpdateWorkshopDto): Promise<Workshop> {
      const session = await this.workshopModel.db.startSession();
      session.startTransaction();
  
      try {
        const workshop = await this.workshopModel.findById(idUser).session(session);
  
        if (!workshop) {
          throw new BadRequestException('Taller no encontrado');
        }
  
  
  
        const updatedWorkshop = await this.workshopModel.findByIdAndUpdate(
          idUser,
          {
            $set: {
              ...(dto.name !== undefined && { name: dto.name }),
              ...(dto.description !== undefined && { description: dto.description }),
              ...(dto.contact_person !== undefined && { contact_person: dto.contact_person }),
              ...(dto.phone !== undefined && { phone: dto.phone }),
              ...(dto.address !== undefined && { address: dto.address }),
            },
          },
          { new: true, session },
        );
  
        
  
        await session.commitTransaction();
  
  
        return updatedWorkshop;
      } catch (error) {
        await session.abortTransaction();
  
        if (error instanceof HttpException) {
          throw error;
        }
  
        throw new InternalServerErrorException(
          `Error updating client: ${error.message}`,
        );
      } finally {
        session.endSession();
      }
    }


    async softDeleteWorkshop(idUser: string): Promise<Workshop> {
      const session = await this.workshopModel.db.startSession();
      session.startTransaction();
  
      try {
        const workshop = await this.workshopModel.findById(idUser).session(session);
  
        if (!workshop) {
          throw new BadRequestException('Taller no encontrado');
        }
  
  
  
        const updatedWorkshop = await this.workshopModel.findByIdAndUpdate(
          idUser,
          {
            $set: {
              status: Estado.INACTIVO
            },
          },
          { new: true, session },
        );

  
        
  
        await session.commitTransaction();
  
  
        return updatedWorkshop;
      } catch (error) {
        await session.abortTransaction();
  
        if (error instanceof HttpException) {
          throw error;
        }
  
        throw new InternalServerErrorException(
          `Error updating client: ${error.message}`,
        );
      } finally {
        session.endSession();
      }
    }



  async findAllCustomersPaginated(
    limit = 5,
    offset = 0,
    search = '',
    sortField: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<{ total: number; items: Workshop[] }> {
    try {
      const workshopFilter: any = {
        status: Estado.ACTIVO,
      };

      // Búsqueda por texto
      if (search) {
        workshopFilter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { contact_person: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { address: { $regex: search, $options: 'i' } },
        ];
      }

      const sort: Record<string, 1 | -1> = {
        [sortField]: sortOrder === 'asc' ? 1 : -1,
      };

      const [total, items] = await Promise.all([
        this.workshopModel.countDocuments(workshopFilter),
        this.workshopModel
          .find(workshopFilter)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .lean(),
      ]);

      return { total, items };
    } catch (error) {
      throw new Error(`Error al listar clientes: ${error.message}`);
    }
  }
}

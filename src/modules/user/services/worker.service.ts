import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Worker, WorkerDocument } from '../schemas/worker.schema';
import { CreateWorkerDto, UpdateWorkerDto } from '../dtos';
import { errorCodes } from 'src/core/common';

@Injectable()
export class WorkerService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Worker.name) private workerModel: Model<WorkerDocument>,
  ) {}

  async findAll() {
    try {
      return await this.workerModel.find().populate('id_user').exec();
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(errorCodes.INVALID_ID);
    }

    const worker = await this.workerModel
      .findById(id)
      .populate('id_user')
      .exec();

    if (!worker) {
      throw new NotFoundException(errorCodes.WORKER_NOT_FOUND);
    }

    return worker;
  }

  async createWorker(dto: CreateWorkerDto) {
    const session = await this.workerModel.db.startSession();
    session.startTransaction();

    try {
      const existingUser = await this.userModel
        .findOne({ email: dto.email })
        .session(session);
      if (existingUser) {
        throw new ConflictException(errorCodes.USER_ALREADY_EXISTS);
      }

      const newUser = new this.userModel({
        email: dto.email,
        full_name: dto.full_name,
        phone: dto.phone,
        role: 'WORKER',
        is_active: true,
      });

      const savedUser = await newUser.save({ session });

      const newWorker = new this.workerModel({
        id_user: savedUser._id,
        is_active: true,
      });

      const savedWorker = await newWorker.save({ session });

      await session.commitTransaction();
      return savedWorker;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(error.message);
    } finally {
      session.endSession();
    }
  }

  async updateWorker(id: string, dto: UpdateWorkerDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(errorCodes.INVALID_ID);
    }

    const session = await this.workerModel.db.startSession();
    session.startTransaction();

    try {
      const worker = await this.workerModel.findById(id).session(session);
      if (!worker) {
        throw new NotFoundException(errorCodes.WORKER_NOT_FOUND);
      }

      const userUpdateFields: any = {};
      if (dto.full_name) userUpdateFields.full_name = dto.full_name;
      if (dto.phone) userUpdateFields.phone = dto.phone;
      if (dto.is_active !== undefined)
        userUpdateFields.is_active = dto.is_active;

      if (Object.keys(userUpdateFields).length > 0) {
        await this.userModel.findByIdAndUpdate(
          worker.id_user,
          userUpdateFields,
          { session },
        );
      }

      const workerUpdateFields: any = {};
      if (dto.is_active !== undefined)
        workerUpdateFields.is_active = dto.is_active;

      const updatedWorker = await this.workerModel.findByIdAndUpdate(
        id,
        workerUpdateFields,
        { new: true, session },
      );

      await session.commitTransaction();
      return updatedWorker;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    } finally {
      session.endSession();
    }
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(errorCodes.INVALID_ID);
    }

    const session = await this.workerModel.db.startSession();
    session.startTransaction();

    try {
      const worker = await this.workerModel.findById(id).session(session);
      if (!worker) {
        throw new NotFoundException(errorCodes.WORKER_NOT_FOUND);
      }

      await this.userModel.findByIdAndDelete(worker.id_user).session(session);
      await this.workerModel.findByIdAndDelete(id).session(session);

      await session.commitTransaction();
      return { success: true };
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error.message);
    } finally {
      session.endSession();
    }
  }
}

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
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Client, ClientDocument } from '../schemas/client.schema';
import { ClientCompany, ClientCompanyDocument } from '../schemas/client-company.schema';
import { CreateClientLandingDto } from '../dtos/create-client-landing.dto';
import { errorCodes } from 'src/core/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuthService } from 'src/auth/services/auth.service';
import { UpdateExtraDataDto, CreateClientAdminDto, UpdateClientAdminDto } from '../dtos';
import { generateRandomPassword } from 'src/core/utils';

@Injectable()
export class ClientService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(ClientCompany.name) private companyModel: Model<ClientCompanyDocument>,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
    @InjectQueue('forgot-password')
    private forgotPasswordQueue: Queue,
    @InjectQueue('security-notifications')
    private securityQueue: Queue,
    @InjectQueue('temporal-credentials')
    private temporalCredentialsQueue: Queue,
  ) { }

  async createClientLanding(dto: CreateClientLandingDto) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const existingUser = await this.userModel.findOne({ email: dto.email }).session(session);
      if (existingUser) {
        throw new HttpException(
          { code: 'EMAIL_ALREADY_EXISTS', message: 'El correo ya fue registrado previamente.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const user = new this.userModel({
        auth_id: dto.auth_id,
        email: dto.email,
        role: 'Cliente',
        status: 'Activo',
      });
      await user.save({ session });

      const client = new this.clientModel({
        id_user: user._id,
        needs_password_change: false,
        created_by_admin: false,
        is_extra_data_completed: false,
        profile_picture: dto.profile_picture ?? null,
      });
      await client.save({ session });

      await session.commitTransaction();
      return { user, client };
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Error creating client: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async validateEmailNotRegistered(email: string): Promise<void> {
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new HttpException(
        { code: errorCodes.EMAIL_ALREADY_EXISTS, message: 'El correo ya fue registrado previamente.' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).populate('client');
  }

  async resetPasswordChangeFlag(user_id: string) {
    try {
      const client = await this.clientModel.findOneAndUpdate(
        { id_user: new Types.ObjectId(user_id) },
        { needs_password_change: false },
        { new: true },
      );
      if (!client) throw new BadRequestException('Cliente no encontrado');
      return client;
    } catch (error) {
      throw new InternalServerErrorException(`Error resetting password flag: ${error.message}`);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new HttpException(
          { code: errorCodes.CLIENT_NOT_FOUND, message: 'No hay un cliente asociado a ese correo.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const resetLink = await this.authService.generatePasswordResetLink(email);
      await this.forgotPasswordQueue.add('sendPasswordResetLink', { to: email, link: resetLink });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Error enviando enlace: ${error.message}`);
    }
  }

  async updateUserExtraData(auth_id: string, dto: UpdateExtraDataDto) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const user = await this.userModel.findOne({ auth_id }).session(session);
      if (!user) throw new BadRequestException('Usuario no encontrado');

      const { client_type, company_name, contact_name, ...userData } = dto;

      await this.userModel.updateOne({ _id: user._id }, userData).session(session);

      const client = await this.clientModel.findOneAndUpdate(
        { id_user: user._id },
        { is_extra_data_completed: true, client_type: client_type },
        { new: true, session },
      );

      if (client_type === 'Empresa' && company_name && contact_name) {
        await this.companyModel.findOneAndUpdate(
          { id_client: client._id },
          { company_name, contact_name },
          { upsert: true, session },
        );
      }

      await session.commitTransaction();
      return this.userModel.findById(user._id).populate('client');
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException(error.message);
    } finally {
      session.endSession();
    }
  }

  async createClientAdmin(dto: CreateClientAdminDto) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const password = generateRandomPassword();
      const firebaseUser = await this.authService.createUserWithEmail({ email: dto.email, password });
      if (!firebaseUser.success) throw new InternalServerErrorException(firebaseUser.message);

      const user = new this.userModel({
        auth_id: firebaseUser.uid,
        email: dto.email,
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone: dto.phone,
        document_type: dto.document_type,
        document_number: dto.document_number,
        role: 'Cliente',
        status: 'Activo',
      });
      await user.save({ session });

      const client = new this.clientModel({
        id_user: user._id,
        client_type: dto.client_type,
        created_by_admin: true,
        needs_password_change: true,
        is_extra_data_completed: true,
      });
      await client.save({ session });

      if (dto.client_type === 'Empresa' && dto.company_name) {
        await new this.companyModel({
          id_client: client._id,
          company_name: dto.company_name,
          contact_name: dto.contact_name,
        }).save({ session });
      }

      await this.temporalCredentialsQueue.add('sendTemporalCredentials', { to: dto.email, email: dto.email, password });
      await session.commitTransaction();
      return user;
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException(`Error creating client: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async updateClientAdmin(idUser: string, dto: UpdateClientAdminDto) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const user = await this.userModel.findById(idUser).session(session);
      if (!user) throw new BadRequestException('Cliente no encontrado');

      const emailChanged = dto.email && dto.email !== user.email;
      let newPassword: string | null = null;

      if (emailChanged) {
        newPassword = generateRandomPassword();
        const firebaseUpdate = await this.authService.updateUserEmail(user.auth_id, { email: dto.email });
        if (!firebaseUpdate.success) throw new InternalServerErrorException(firebaseUpdate.message);

        await this.securityQueue.add('sendEmailChangeNotification', { to: user.email, oldEmail: user.email, newEmail: dto.email });
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        idUser,
        {
          email: dto.email,
          first_name: dto.first_name,
          last_name: dto.last_name,
          phone: dto.phone,
          document_type: dto.document_type,
          document_number: dto.document_number,
          status: dto.status,
        },
        { new: true, session },
      );

      const client = await this.clientModel.findOneAndUpdate(
        { id_user: user._id },
        { client_type: dto.client_type, needs_password_change: emailChanged ? true : false },
        { new: true, session },
      );

      if (dto.client_type === 'Empresa') {
        await this.companyModel.findOneAndUpdate(
          { id_client: client._id },
          { company_name: dto.company_name, contact_name: dto.contact_name },
          { upsert: true, session },
        );
      } else {
        await this.companyModel.deleteOne({ id_client: client._id }).session(session);
      }

      if (emailChanged && newPassword) {
        await this.temporalCredentialsQueue.add('sendTemporalCredentials', { to: dto.email, email: dto.email, password: newPassword });
      }

      await session.commitTransaction();
      return updatedUser;
    } catch (error) {
      await session.abortTransaction();
      throw new InternalServerErrorException(`Error updating client: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async findAllCustomersPaginated(limit = 5, offset = 0, search = '', sortField = 'created_at', sortOrder: 'asc' | 'desc' = 'asc', clientType?: string) {
    const query: any = { role: 'Cliente' };
    if (search) {
      query.$or = [
        { email: new RegExp(search, 'i') },
        { first_name: new RegExp(search, 'i') },
        { last_name: new RegExp(search, 'i') },
      ];
    }

    const [total, items] = await Promise.all([
      this.userModel.countDocuments(query),
      this.userModel.find(query)
        .skip(offset)
        .limit(limit)
        .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
        .populate('client'),
    ]);

    return { total, items };
  }
}

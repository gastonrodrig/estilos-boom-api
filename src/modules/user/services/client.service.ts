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
  User, UserDocument,
  Client, ClientDocument,
  ClientCompany, ClientCompanyDocument,
  ClientAddress, ClientAddressDocument
} from '../schemas';
import { errorCodes } from 'src/core/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CreateClientLandingDto,
  UpdateExtraDataDto,
  CreateClientAdminDto,
  UpdateClientAdminDto
} from '../dtos';
import { generateRandomPassword, toObjectId } from 'src/core/utils';
import { Estado, Roles } from 'src/core/constants/app.constants';
import { ClientType } from '../enums';
import { AuthService } from 'src/modules/firebase/services';

@Injectable()
export class ClientService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Client.name)
    private clientModel: Model<ClientDocument>,
    @InjectModel(ClientCompany.name)
    private companyModel: Model<ClientCompanyDocument>,
    @InjectModel(ClientAddress.name)
    private addressModel: Model<ClientAddressDocument>,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
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
          {
            code: errorCodes.EMAIL_ALREADY_EXISTS,
            message: 'El correo ya fue registrado previamente.'
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const user = new this.userModel({
        auth_id: dto.auth_id,
        email: dto.email,
        phone: null,
        first_name: null,
        last_name: null,
        document_type: null,
        document_number: null,
        role: Roles.CLIENT,
        status: Estado.ACTIVO,
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
        {
          code: errorCodes.EMAIL_ALREADY_EXISTS,
          message: 'El correo ya fue registrado previamente.'
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).populate('client');
  }

  async resetPasswordChangeFlag(auth_id: string) {
    try {
      const user = await this.userModel.findOne({ auth_id });
      if (!user) throw new BadRequestException('Usuario no encontrado');

      const client = await this.clientModel.findOneAndUpdate(
        { id_user: user._id },
        { needs_password_change: false },
        { new: true },
      );
      if (!client) throw new BadRequestException('Registro de cliente no encontrado');
      return client;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Error resetting password flag: ${error.message}`);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new HttpException(
          {
            code: errorCodes.CLIENT_NOT_FOUND,
            message: 'No hay un cliente asociado a ese correo.'
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (user.role !== Roles.CLIENT) {
        throw new HttpException(
          {
            code: errorCodes.USER_IS_NOT_CLIENT,
            message: 'Este correo no pertenece a un cliente.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const resetLink = await this.authService.generatePasswordResetLink(email);

      await this.forgotPasswordQueue.add(
        'sendPasswordResetLink',
        {
          to: email,
          link: resetLink,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 100,
        },
      );
    } catch (error) {
      if (error.message?.includes('Unable to create the email action link')) {
        throw new HttpException(
          {
            code: errorCodes.INVALID_PROVIDER,
            message:
              'Este correo está registrado con un proveedor externo. No es posible restablecer la contraseña.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Error enviando enlace de reseteo: ${error.message}`,
      );
    }
  }

  async updateUserExtraData(
    auth_id: string,
    dto: UpdateExtraDataDto,
  ): Promise<User> {
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      const user = await this.userModel.findOne({ auth_id }).session(session);

      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      const {
        client_type,
        company_name,
        contact_name,
        addresses,
        ...userData
      } = dto;

      await this.userModel.updateOne(
        { _id: user._id },
        { $set: userData },
        { session },
      );

      const client = await this.clientModel.findOne({ id_user: user._id }).session(session);

      if (!client) {
        throw new BadRequestException('Cliente no encontrado');
      }

      await this.clientModel.updateOne(
        { _id: client._id },
        {
          $set: {
            is_extra_data_completed: true,
            ...(client_type && { client_type }),
          },
        },
        { session },
      );

      if (addresses && addresses.length > 0) {
        await this.addressModel.deleteMany({ id_client: client._id }).session(session);

        const addressDocs = addresses.map((address) => ({
          id_client: client._id,
          address_line: address.address_line,
          reference: address.reference ?? null,
          department: address.department ?? null,
          province: address.province ?? null,
          district: address.district ?? null,
          is_default: !!address.is_default,
        }));

        await this.addressModel.insertMany(addressDocs, { session });
      }

      if (client_type === ClientType.EMPRESA) {
        if (!company_name || !contact_name) {
          throw new BadRequestException(
            'Empresa requiere company_name y contact_name',
          );
        }

        const existingCompany = await this.companyModel
          .findOne({ id_client: client._id })
          .session(session);

        if (existingCompany) {
          await this.companyModel.updateOne(
            { _id: existingCompany._id },
            {
              $set: {
                company_name,
                contact_name,
              },
            },
            { session },
          );
        } else {
          await this.companyModel.create(
            [
              {
                id_client: client._id,
                company_name,
                contact_name,
              },
            ],
            { session },
          );
        }
      }

      await session.commitTransaction();

      return await this.userModel.findById(user._id);
    } catch (error) {
      await session.abortTransaction();

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(error.message);
    } finally {
      session.endSession();
    }
  }

  async findAllCustomersPaginated(
    limit = 5,
    offset = 0,
    search = '',
    sortField: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'asc',
    clientType?: ClientType,
  ): Promise<{ total: number; items: User[] }> {
    try {
      const userFilter: any = {
        role: Roles.CLIENT,
      };

      if (search) {
        userFilter.$or = [
          { email: { $regex: search, $options: 'i' } },
          { first_name: { $regex: search, $options: 'i' } },
          { last_name: { $regex: search, $options: 'i' } },
          { document_number: { $regex: search, $options: 'i' } },
        ];
      }

      if (clientType) {
        const clients = await this.clientModel
          .find({ client_type: clientType })
          .select('id_user')
          .lean();

        const userIds = clients.map((client) => client.id_user);

        userFilter._id = { $in: userIds };
      }

      const sort: Record<string, 1 | -1> = {
        [sortField]: sortOrder === 'asc' ? 1 : -1,
      };

      const [total, users] = await Promise.all([
        this.userModel.countDocuments(userFilter),
        this.userModel
          .find(userFilter)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .lean(),
      ]);

      // Poblamos datos de Client y sus Addresses para cada usuario
      const items = await Promise.all(
        users.map(async (user) => {
          const clientData = await this.clientModel.findOne({ id_user: user._id }).lean();
          let addresses = [];

          if (clientData) {
            addresses = await this.addressModel.find({ id_client: clientData._id }).lean();
          }

          return {
            ...user,
            ...clientData,
            addresses: addresses || [],
            _id: user._id.toString(),
            id_user: user._id.toString(),
          };
        }),
      );

      return { total, items };
    } catch (error) {
      throw new Error(`Error al listar clientes: ${error.message}`);
    }
  }

  async createClientAdmin(dto: CreateClientAdminDto): Promise<User> {
    const isPerson = dto.client_type === ClientType.PERSONA;
    const isCompany = dto.client_type === ClientType.EMPRESA;

    if (isPerson) {
      if (!dto.first_name || !dto.last_name) {
        throw new HttpException(
          { message: 'Nombre y apellido son requeridos para persona.' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (isCompany) {
      if (!dto.company_name || !dto.contact_name) {
        throw new HttpException(
          { message: 'Datos de empresa incompletos.' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }


    const [existingEmail, existingDoc] = await Promise.all([
      this.userModel.findOne({ email: dto.email }).lean(),
      dto.document_number
        ? this.userModel.findOne({ document_number: dto.document_number }).lean()
        : null,
    ]);

    if (existingEmail) {
      throw new HttpException(
        {
          code: errorCodes.EMAIL_ALREADY_EXISTS,
          message: 'El correo ya fue registrado previamente.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (existingDoc) {
      throw new HttpException(
        {
          code: errorCodes.DOCUMENT_NUMBER_ALREADY_EXISTS,
          message: 'El número de documento ya fue registrado previamente.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }


    const addresses = dto.addresses ?? [];
    const defaultAddresses = addresses.filter((address) => address.is_default);

    if (defaultAddresses.length > 1) {
      throw new HttpException(
        {
          message: 'Solo una dirección puede marcarse como predeterminada.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedAddresses =
      addresses.length > 0
        ? addresses.map((address, index) => ({
          ...address,
          is_default:
            defaultAddresses.length === 0 ? index === 0 : !!address.is_default,
        }))
        : [];

    const password = dto.password || generateRandomPassword();


    let firebaseUid: string;
    try {
      const firebaseUser = await this.authService.createUserWithEmail({
        email: dto.email,
        password,
      });

      if (firebaseUser.success && firebaseUser.uid) {
        firebaseUid = firebaseUser.uid;
      } else if (firebaseUser.message.includes('already in use')) {
        const existingAuth = await this.authService.getUserByEmail(dto.email);
        if (existingAuth.success && existingAuth.uid) {
          firebaseUid = existingAuth.uid;
          const passwordUpdate = await this.authService.updateUserPassword(firebaseUid, password);
          if (!passwordUpdate.success) {
            throw new InternalServerErrorException(
              `No se pudo actualizar la contraseña del usuario existente en Firebase: ${passwordUpdate.message}`,
            );
          }
        } else {
          throw new InternalServerErrorException(
            `Usuario existe en Firebase pero no pudimos recuperar su UID: ${existingAuth.message}`,
          );
        }
      } else {
        throw new InternalServerErrorException(firebaseUser.message);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Error en Firebase: ${error.message}`);
    }


    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      const createdUsers = await this.userModel.create(
        [
          {
            auth_id: firebaseUid,
            email: dto.email,
            first_name: dto.first_name,
            last_name: dto.last_name,
            phone: dto.phone,
            document_type: dto.document_type,
            document_number: dto.document_number,
            role: Roles.CLIENT,
            status: Estado.ACTIVO,
          },
        ],
        { session },
      );

      const newUser = createdUsers[0];

      const createdClients = await this.clientModel.create(
        [
          {
            id_user: newUser._id,
            client_type: dto.client_type,
            created_by_admin: true,
            needs_password_change: true,
            is_extra_data_completed: true,
          },
        ],
        { session },
      );

      const client = createdClients[0];

      if (isCompany) {
        await this.companyModel.create(
          [
            {
              id_client: client._id,
              company_name: dto.company_name,
              contact_name: dto.contact_name,
            },
          ],
          { session },
        );
      }

      if (normalizedAddresses.length > 0) {
        const addressDocs = normalizedAddresses.map((address) => ({
          id_client: client._id,
          address_line: address.address_line,
          reference: address.reference ?? null,
          department: address.department ?? null,
          province: address.province ?? null,
          district: address.district ?? null,
          is_default: !!address.is_default,
        }));

        await this.addressModel.insertMany(addressDocs, { session });
      }

      await session.commitTransaction();


      await this.temporalCredentialsQueue.add(
        'sendTemporalCredentials',
        {
          to: dto.email,
          email: dto.email,
          password,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );

      return newUser;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Error creating client: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async updateClientAdmin(idUser: string, dto: UpdateClientAdminDto): Promise<User> {
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      const user = await this.userModel.findById(idUser).session(session);

      if (!user) {
        throw new BadRequestException('Cliente no encontrado');
      }

      const emailChanged = !!dto.email && dto.email !== user.email;
      const documentChanged =
        !!dto.document_number && dto.document_number !== user.document_number;

      let newPassword: string | null = null;

      // Validar email único
      if (emailChanged) {
        const existingEmail = await this.userModel
          .findOne({
            email: dto.email,
            _id: { $ne: toObjectId(idUser) }
          })
          .lean();

        if (existingEmail) {
          throw new HttpException(
            {
              code: errorCodes.EMAIL_ALREADY_EXISTS,
              message: 'El correo ya fue registrado previamente.',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Validar documento único
      if (documentChanged) {
        const existingDoc = await this.userModel
          .findOne({
            document_number: dto.document_number,
            _id: { $ne: user._id },
          })
          .lean();

        if (existingDoc) {
          throw new HttpException(
            {
              code: errorCodes.DOCUMENT_NUMBER_ALREADY_EXISTS,
              message: 'El número de documento ya fue registrado previamente.',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const client = await this.clientModel.findOne({ id_user: user._id }).session(session);

      if (!client) {
        throw new BadRequestException('Registro de cliente no encontrado');
      }

      if (emailChanged) {
        const firebaseUpdate = await this.authService.updateUserEmail(user.auth_id, {
          email: dto.email,
        });

        if (!firebaseUpdate.success) {
          throw new InternalServerErrorException(firebaseUpdate.message);
        }

        newPassword = generateRandomPassword();

        const firebasePasswordUpdate = await this.authService.updateUserPassword(
          user.auth_id,
          newPassword,
        );

        if (!firebasePasswordUpdate.success) {
          throw new InternalServerErrorException(firebasePasswordUpdate.message);
        }

        await this.securityQueue.add('sendEmailChangeNotification', {
          to: user.email,
          oldEmail: user.email,
          newEmail: dto.email,
        });
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        idUser,
        {
          $set: {
            ...(dto.email !== undefined && { email: dto.email }),
            ...(dto.first_name !== undefined && { first_name: dto.first_name }),
            ...(dto.last_name !== undefined && { last_name: dto.last_name }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
            ...(dto.document_type !== undefined && { document_type: dto.document_type }),
            ...(dto.document_number !== undefined && { document_number: dto.document_number }),
            ...(dto.status !== undefined && { status: dto.status }),
          },
        },
        { new: true, session },
      );

      await this.clientModel.findByIdAndUpdate(
        client._id,
        {
          $set: {
            ...(dto.client_type !== undefined && { client_type: dto.client_type }),
            needs_password_change: emailChanged ? true : client.needs_password_change,
          },
        },
        { new: true, session },
      );

      if (dto.client_type === ClientType.EMPRESA) {
        if (!dto.company_name || !dto.contact_name) {
          throw new BadRequestException(
            'Empresa requiere company_name y contact_name',
          );
        }

        await this.companyModel.findOneAndUpdate(
          { id_client: client._id },
          {
            $set: {
              company_name: dto.company_name,
              contact_name: dto.contact_name,
            },
          },
          {
            upsert: true,
            new: true,
            session,
          },
        );
      } else if (dto.client_type === ClientType.PERSONA) {
        await this.companyModel.deleteOne({ id_client: client._id }).session(session);
      }

      if (dto.addresses) {
        await this.addressModel.deleteMany({ id_client: client._id }).session(session);
        if (dto.addresses.length > 0) {
          const addressDocs = dto.addresses.map((address) => ({
            id_client: client._id,
            address_line: address.address_line,
            reference: address.reference ?? null,
            department: address.department ?? null,
            province: address.province ?? null,
            district: address.district ?? null,
            is_default: !!address.is_default,
          }));
          await this.addressModel.insertMany(addressDocs, { session });
        }
      }

      await session.commitTransaction();

      if (emailChanged && newPassword) {
        await this.temporalCredentialsQueue.add('sendTemporalCredentials', {
          to: dto.email,
          email: dto.email,
          password: newPassword,
        });
      }

      return updatedUser;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Error updating client: ${error.message}`);
    } finally {
      session.endSession();
    }
  }
}

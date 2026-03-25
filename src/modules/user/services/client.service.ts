import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientLandingDto } from '../dtos/create-client-landing.dto';
import { Estado, Roles } from 'src/core/constants/app.constants';
import { RequestPasswordResetDto } from '../dtos/request-password-reset.dto';
import { errorCodes } from 'src/core/common';
import { role_enum, status_enum, User } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuthService } from 'src/modules/firebase/services';
import { UpdateExtraDataDto, CreateClientAdminDto, UpdateClientAdminDto } from '../dtos';
import { client_type_enum } from '@prisma/client';
import { generateRandomPassword } from 'src/core/utils';

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private authService: AuthService,
    @InjectQueue('forgot-password')
    private forgotPasswordQueue: Queue,
    @InjectQueue('temporal-credentials')
    private temporalCredentialsQueue: Queue,
  ) {}

  async createClientLanding(dto: CreateClientLandingDto) {
    try {
      // 1. Validar email
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new HttpException(
          {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'El correo ya fue registrado previamente.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Transacción (User + Client)
      const result = await this.prisma.$transaction(async (tx) => {
        // -------- USER --------
        const user = await tx.user.create({
          data: {
            auth_id: dto.auth_id,
            email: dto.email,

            phone: null,
            first_name: null,
            last_name: null,
            document_type: null,
            document_number: null,

            role: Roles.CLIENT,
            status: Estado.ACTIVO,
          },
        });

        // -------- CLIENT --------
        const client = await tx.client.create({
          data: {
            user: {
              connect: {
                id_user: user.id_user,
              },
            },

            needs_password_change: false,
            created_by_admin: false,
            is_extra_data_completed: false,

            // opcionales en el DTO
            profile_picture: dto.profile_picture ?? null,
          },
        });

        return { user, client };
      });

      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException(
        `Error creating client: ${error.message}`,
      );
    }
  }

  async findByEmail(email: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        client: {
          include: {
            client_company: true,
          },
        },
      },
    });
  }

  async validateEmailNotRegistered(email: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new HttpException(
        {
          code: errorCodes.EMAIL_ALREADY_EXISTS,
          message: 'El correo ya fue registrado previamente.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async resetPasswordChangeFlag(user_id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id_user: user_id },
        include: {
          client: true,
        },
      });
      if (!user) {
        throw new BadRequestException('Usuario no encontrado');
      }

      return await this.prisma.client.update({
        where: {
          id_client: user.client.id_client,
        },
        data: {
          needs_password_change: false,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Error resetting password flag: ${error.message}`,
      );
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      // Validar que el cliente exista
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new HttpException(
          {
            code: errorCodes.CLIENT_NOT_FOUND,
            message: 'No hay un cliente asociado a ese correo.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validar que el usuario sea un cliente
      if (user.role !== Roles.CLIENT) {
        throw new HttpException(
          {
            code: errorCodes.USER_IS_NOT_CLIENT,
            message: 'Este correo no pertenece a un cliente.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Usar Firebase Admin SDK para generar el enlace
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
    try {
      const user = await this.prisma.user.findUnique({
        where: { auth_id },
        include: { client: true },
      });

      if (!user) throw new BadRequestException('Usuario no encontrado');

      // validar documento único
      if (dto.document_number) {
        const existingDoc = await this.prisma.user.findUnique({
          where: { document_number: dto.document_number },
        });

        if (existingDoc && existingDoc.id_user !== user.id_user) {
          throw new HttpException(
            {
              code: errorCodes.DOCUMENT_NUMBER_ALREADY_EXISTS,
              message: 'El número de documento ya fue registrado previamente.',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const {
        client_type,
        company_name,
        contact_name,
        ...userData
      } = dto;

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id_user: user.id_user },
          data: userData,
        });

        const client = await tx.client.update({
          where: { id_user: user.id_user },
          data: {
            is_extra_data_completed: true,
            ...(client_type && { client_type }),
          },
        });

        if (client_type === 'Empresa') {
          if (!company_name || !contact_name) {
            throw new BadRequestException(
              'Empresa requiere company_name y contact_name',
            );
          }

          await tx.clientCompany.create({
            data: {
              id_client: client.id_client,
              company_name,
              contact_name,
            },
          });
        }
      });

      return this.prisma.user.findUnique({
        where: { id_user: user.id_user },
        include: {
          client: {
            include: {
              client_company: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAllCustomersPaginated(
    limit = 5,
    offset = 0,
    search = '',
    sortField: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'asc',
    clientType?: client_type_enum,
  ): Promise<{ total: number; items: User[] }> {
    try {
      const where: any = {
        role: 'Cliente',

        // filtro por relación (Client)
        ...(clientType && {
          client: {
            client_type: clientType,
          },
        }),

        // búsqueda
        ...(search && {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { document_number: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const [total, items] = await this.prisma.$transaction([
        this.prisma.user.count({ where }),

        this.prisma.user.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: {
            [sortField]: sortOrder,
          },
          include: {
            client: true,
          },
        }),
      ]);

      return { total, items };
    } catch (error) {
      throw new Error(`Error al listar clientes: ${error.message}`);
    }
  }

  async createClientAdmin(dto: CreateClientAdminDto): Promise<User> {
    try {
      // 1. Validar datos según tipo de cliente
      const isPerson = dto.client_type === client_type_enum.Persona;
      const isCompany = dto.client_type === client_type_enum.Empresa;

      if (isPerson) {
        if (!dto.first_name || !dto.last_name) {
          throw new HttpException(
            { message: 'Nombre y apellido son requeridos para persona.' },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      if (isCompany) {
        if (
          !dto.company_name ||
          !dto.contact_name
        ) {
          throw new HttpException(
            { message: 'Datos de empresa incompletos.' },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 2. Validar únicos
      const [existingEmail, existingDoc] = await Promise.all([
        this.prisma.user.findUnique({ where: { email: dto.email } }),
        dto.document_number
          ? this.prisma.user.findUnique({
              where: { document_number: dto.document_number },
            })
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

      // 3. Direcciones
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

      // 4. Password
      const password = generateRandomPassword();

      // 5. Firebase
      const firebaseUser = await this.authService.createUserWithEmail({
        email: dto.email,
        password,
      });

      if (!firebaseUser.success || !firebaseUser.uid) {
        throw new InternalServerErrorException(firebaseUser.message);
      }

      // 6. Transacción
      const user = await this.prisma.$transaction(async (tx) => {

        // USER
        const newUser = await tx.user.create({
          data: {
            auth_id: firebaseUser.uid,
            email: dto.email,
            first_name: dto.first_name,
            last_name: dto.last_name,
            phone: dto.phone,
            document_type: dto.document_type,
            document_number: dto.document_number,
            role: role_enum.Cliente,
            status: status_enum.Activo,
          },
        });

        // CLIENT
        const client = await tx.client.create({
          data: {
            id_user: newUser.id_user,
            client_type: dto.client_type,
            created_by_admin: true,
            needs_password_change: true,
            is_extra_data_completed: true,
          },
        });

        // PARA CLIENTE EMPRESA
        if (isCompany) {
          await tx.clientCompany.create({
            data: {
              id_client: client.id_client,
              company_name: dto.company_name,
              contact_name: dto.contact_name,
            },
          });
        }

        // DIRECCIONES
        if (normalizedAddresses.length > 0) {
          await tx.clientAddress.createMany({
            data: normalizedAddresses.map((address) => ({
              id_client: client.id_client,
              address_line: address.address_line,
              reference: address.reference ?? null,
              department: address.department ?? null,
              province: address.province ?? null,
              district: address.district ?? null,
              is_default: !!address.is_default,
            })),
          });
        }

        return newUser;
      });

      // 7. Enviar credenciales
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

      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(
        `Error creating client: ${error.message}`,
      );
    }
  }

  async updateClientAdmin(
    idUser: string,
    dto: UpdateClientAdminDto,
  ): Promise<User> {
    try {
      const currentUser = await this.prisma.user.findUnique({
        where: { id_user: idUser },
        include: {
          client: {
            include: {
              client_company: true,
            },
          },
        },
      });

      const isPerson = dto.client_type === client_type_enum.Persona;
      const isCompany = dto.client_type === client_type_enum.Empresa;

      // 1. Validaciones por tipo
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

      // 2. Detectar cambios importantes
      const emailChanged = dto.email !== currentUser.email;
      const documentChanged =
        dto.document_number &&
        dto.document_number !== currentUser.document_number;

      // 3. Validar email solo si cambió
      if (emailChanged) {
        const existingEmail = await this.prisma.user.findFirst({
          where: {
            email: dto.email,
            NOT: {
              id_user: idUser,
            },
          },
        });

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

      // 4. Validar documento solo si cambió
      if (documentChanged) {
        const existingDoc = await this.prisma.user.findFirst({
          where: {
            document_number: dto.document_number,
            NOT: {
              id_user: idUser,
            },
          },
        });

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

      // 5. Si cambió el correo, generar nueva contraseña temporal
      let newPassword: string | null = null;

      if (emailChanged) {
        newPassword = generateRandomPassword();

        const firebaseUpdate = await this.authService.updateUserEmail(
          currentUser.auth_id,
          { email: dto.email },
        );

        if (!firebaseUpdate.success) {
          throw new InternalServerErrorException(
            firebaseUpdate.message ||
              'No se pudo actualizar el usuario en Firebase.',
          );
        }
      }

      // 6. Transacción BD
      const updatedUser = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id_user: idUser },
          data: {
            email: dto.email,
            first_name: dto.first_name,
            last_name: dto.last_name,
            phone: dto.phone,
            document_type: dto.document_type,
            document_number: dto.document_number,
          },
        });

        const client = await tx.client.update({
          where: { id_user: idUser },
          data: {
            client_type: dto.client_type,
            needs_password_change: emailChanged
              ? true
              : currentUser.client.needs_password_change,
          },
        });

        if (isCompany) {
          await tx.clientCompany.upsert({
            where: { id_client: client.id_client },
            update: {
              company_name: dto.company_name!,
              contact_name: dto.contact_name!,
            },
            create: {
              id_client: client.id_client,
              company_name: dto.company_name!,
              contact_name: dto.contact_name!,
            },
          });
        }

        if (isPerson && currentUser.client.client_company) {
          await tx.clientCompany.delete({
            where: { id_client: client.id_client },
          });
        }

        return user;
      });

      // 7. Reenviar credenciales solo si cambió correo
      if (emailChanged && newPassword) {
        await this.temporalCredentialsQueue.add(
          'sendTemporalCredentials',
          {
            to: dto.email,
            email: dto.email,
            password: newPassword,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        );
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new InternalServerErrorException(
        `Error updating client: ${error.message}`,
      );
    }
  }
}

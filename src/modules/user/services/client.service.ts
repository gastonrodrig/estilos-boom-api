import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientLandingDto } from '../dtos/create-client-landing.dto';
import { Estado, Roles } from 'src/core/constants/app.constants';
import { RequestPasswordResetDto } from '../dtos/request-password-reset.dto';
import { errorCodes } from 'src/core/common';
import { User } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuthService } from 'src/modules/firebase/services';

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('forgot-password')
    private forgotPasswordQueue: Queue,
    private authService: AuthService,
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

            role: Roles.CLIENTE,
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

      return {
        message: 'Cliente creado correctamente',
        data: result,
      };
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
      if (user.role !== Roles.CLIENTE) {
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
}

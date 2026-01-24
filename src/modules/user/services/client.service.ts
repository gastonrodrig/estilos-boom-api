import { HttpException, HttpStatus, Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateClientLandingDto } from "../dtos/create-client-landing.dto";
import { ClientType } from "../enums/client-type.enum";
import { Estado } from "src/core/constants/app.constants";

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) { }
  
  async createClientLanding(
    dto: CreateClientLandingDto,
  ) {
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

}

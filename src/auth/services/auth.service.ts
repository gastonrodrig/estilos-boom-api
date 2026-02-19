import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';
import { role_enum, status_enum } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async syncUser(decoded: any) {
    const { uid } = decoded;
    const userRecord = await admin.auth().getUser(uid);

    let email = userRecord.email;
    if (!email && userRecord.providerData.length > 0) {
      email = userRecord.providerData[0].email;
    }
    if (!email) {
      throw new UnauthorizedException('Email not found in token');
    }

    // Normalizar email 
    email = email.trim().toLowerCase();

    const photo = userRecord.photoURL || '';

    const includeClient = {
      client: {
        include: {
          client_company: true,
        },
      },
    };

    const findUserByEmail = () =>
      this.prisma.user.findUnique({
        where: { email },
        include: includeClient,
      });

    const ensureAuthId = (currentUser: typeof user | null) =>
      currentUser && !currentUser.auth_id
        ? this.prisma.user.update({
            where: { id_user: currentUser.id_user },
            data: { auth_id: uid },
            include: includeClient,
          })
        : currentUser;

    // Buscar usuario por email
    let user = await findUserByEmail();

    // CASO 1: Existe usuario → asegurar que tenga auth_id
    if (user) {
      user = await ensureAuthId(user);
    } else {
      // CASO 2: NO existe → crear
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              auth_id: uid,
              email,
              role: role_enum.Cliente,
              status: status_enum.Activo,
            },
          });

          const client = await tx.client.create({
            data: {
              id_user: newUser.id_user,
              profile_picture: photo,
              needs_password_change: false,
              created_by_admin: false,
              is_extra_data_completed: false,
            },
          });

          return {
            ...newUser,
            client,
          };
        });

        user = result as any;
      } catch (error: any) {
        // Manejo de duplicados (race condition)
        if (error.code === 'P2002') {
          user = await ensureAuthId(await findUserByEmail());
        } else {
          throw error;
        }
      }
    }

    // Asignar rol al token (custom claims)
    await admin.auth().setCustomUserClaims(uid, {
      role: user.role,
    });

    return {
      user,
    };
  }
}

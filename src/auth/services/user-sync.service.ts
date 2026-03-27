import { Injectable, UnauthorizedException, InternalServerErrorException, HttpException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../modules/user/schemas/user.schema';
import { Client, ClientDocument } from '../../modules/user/schemas/client.schema';
import { ClientCompany, ClientCompanyDocument } from '../../modules/user/schemas/client-company.schema';
import { Estado, Roles } from 'src/core/constants/app.constants';

@Injectable()
export class UserSyncService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(ClientCompany.name)
    private clientCompanyModel: Model<ClientCompanyDocument>,
  ) { }

  async syncUser(decoded: any) {
    // const session = await this.userModel.db.startSession();
    // session.startTransaction();

    try {
      if (!decoded?.uid) {
        throw new UnauthorizedException('Token no enviado o invalido');
      }

      const { uid } = decoded;
      const userRecord = await admin.auth().getUser(uid);

      let email = userRecord.email;
      if (!email && userRecord.providerData.length > 0) {
        email = userRecord.providerData[0].email || '';
      }

      if (!email) {
        throw new UnauthorizedException('Email not found in token');
      }

      // Normalizar email
      email = email.trim().toLowerCase();

      const photo = userRecord.photoURL || '';

      // Buscar usuario por email
      let user = await this.userModel
        .findOne({ email })
        // .session(session);

      // CASO 1: Existe usuario → asegurar auth_id
      if (user) {
        if (!user.auth_id) {
          user = await this.userModel.findByIdAndUpdate(
            user._id,
            { $set: { auth_id: uid } },
            // { new: true, session },
          );
        }
      } else {
        // CASO 2: No existe → crear User + Client
        try {
          const createdUsers = await this.userModel.create(
            [
              {
                auth_id: uid,
                email,
                role: Roles.CLIENT,
                status: Estado.ACTIVO,
              },
            ],
            // { session },
          );

          const newUser = createdUsers[0];

          await this.clientModel.create(
            [
              {
                id_user: newUser._id,
                profile_picture: photo,
                needs_password_change: false,
                created_by_admin: false,
                is_extra_data_completed: false,
              },
            ],
            // { session },
          );

          user = newUser;
        } catch (error: any) {
          if (error?.code === 11000) {
            user = await this.userModel.findOne({ email })
            // .session(session);

            if (user && !user.auth_id) {
              user = await this.userModel.findByIdAndUpdate(
                user._id,
                { $set: { auth_id: uid } },
                // { new: true, session },
              );
            }
          } else {
            throw error;
          }
        }
      }

      if (!user) {
        throw new InternalServerErrorException('No se pudo sincronizar el usuario');
      }

      // await session.commitTransaction();

      // Leer usuario final con client y company usando los ids reales del esquema
      const finalUser = await this.userModel.findById(user._id).lean();

      const client = await this.clientModel.findOne({ id_user: user._id }).lean();
      const clientCompany = client
        ? await this.clientCompanyModel.findOne({ id_client: client._id }).lean()
        : null;

      // Asignar rol al token
      await admin.auth().setCustomUserClaims(uid, {
        role: finalUser?.role,
      });

      return {
        user: {
          ...finalUser,
          client: client
            ? {
              ...client,
              client_company: clientCompany,
            }
            : null,
        },
      };
    } catch (error) {
      // await session.abortTransaction();

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Error syncing user: ${error.message}`,
      );
    } finally {
      // session.endSession();
    }
  }
}

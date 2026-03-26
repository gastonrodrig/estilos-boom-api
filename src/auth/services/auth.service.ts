import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../modules/user/schemas/user.schema';
import { Client, ClientDocument } from '../../modules/user/schemas/client.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) { }

  async generatePasswordResetLink(email: string): Promise<string> {
    return await admin.auth().generatePasswordResetLink(email);
  }

  async createUserWithEmail(dto: any) {
    try {
      const user = await admin.auth().createUser({
        email: dto.email,
        password: dto.password,
      });
      return { success: true, uid: user.uid };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateUserEmail(uid: string, dto: { email: string }) {
    try {
      await admin.auth().updateUser(uid, {
        email: dto.email,
      });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

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

    email = email.trim().toLowerCase();
    const photo = userRecord.photoURL || '';

    let user = await this.userModel.findOne({ email }).populate('client');

    if (user) {
      if (!user.auth_id) {
        user = await this.userModel.findByIdAndUpdate(
          user._id,
          { auth_id: uid },
          { new: true }
        ).populate('client');
      }
    } else {
      const session = await this.userModel.db.startSession();
      session.startTransaction();
      try {
        const newUser = new this.userModel({
          auth_id: uid,
          email,
          role: 'Cliente',
          status: 'Activo',
        });
        await newUser.save({ session });

        const newClient = new this.clientModel({
          id_user: newUser._id,
          profile_picture: photo,
          needs_password_change: false,
          created_by_admin: false,
          is_extra_data_completed: false,
        });
        await newClient.save({ session });

        await session.commitTransaction();
        user = await this.userModel.findById(newUser._id).populate('client');
      } catch (error) {
        await session.abortTransaction();
        console.error('Error in syncUser:', error);
        if (error.code === 11000) {
          user = await this.userModel.findOne({ email }).populate('client');
        } else {
          throw new InternalServerErrorException(`Error syncing user: ${error.message}`);
        }
      } finally {
        session.endSession();
      }
    }

    await admin.auth().setCustomUserClaims(uid, {
      role: user.role,
    });

    return { user };
  }
}

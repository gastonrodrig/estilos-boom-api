import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CreateFirebaseUserDto, UpdateFirebaseUserDto } from '../dto';

@Injectable()
export class AuthService {
  async createUserWithEmail(createFirebaseUserDto: CreateFirebaseUserDto): Promise<{ success: boolean; uid?: string; message: string }> {
    try {
      const { email, password } = createFirebaseUserDto;
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });
      return {
        success: true,
        uid: userRecord.uid,
        message: 'Usuario creado correctamente',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al crear el usuario',
      };
    }
  }

  async updateUserEmail(uid: string, dto: UpdateFirebaseUserDto): Promise<{ success: boolean; uid?: string; message: string }> {
    try {
      const { email } = dto;
      const userRecord = await admin.auth().updateUser(uid, { email });
      return {
        success: true,
        uid: userRecord.uid,
        message: 'Correo actualizado correctamente',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al actualizar el correo',
      };
    }
  }
  
  async generatePasswordResetLink(email: string): Promise<string> {
    const firebaseLink = await admin.auth().generatePasswordResetLink(email);
    
    const oobCode = new URL(firebaseLink).searchParams.get('oobCode');
    if (!oobCode) throw new Error('No se pudo extraer oobCode');

    const baseUrl = process.env.APP_URL;
    return `${baseUrl}/auth/reset-password?oobCode=${oobCode}&mode=resetPassword`;
  }
}
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import {
  CreatePasswordResetLinkMailDto,
  CreateTemporalCredentialMailDto,
} from '../dto';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  async sendEmailChangeNotification(to: string, oldEmail: string, newEmail: string) {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject: 'Alerta de Seguridad: Cambio de correo electrónico - Estilos Boom',
      html: `
       <html>
  <head></head>
  <body style="margin:0; padding:0; background:#ffffff; font-family: Arial, sans-serif;">
    <div style="max-width:560px; margin:24px auto; background:#ffffff; border:1px solid #C1BFC0;">
      <!-- Header -->
      <div style="padding:32px 24px; text-align:center;">
        <img src="https://i.postimg.cc/GtGzCjqh/meta-icon.png" alt="Estilos Boom" width="64" style="display:block; margin:0 auto 16px;"/>
        <h1 style="margin:0; font-size:24px; color:#252020; font-weight:700;">Seguridad de la cuenta</h1>
      </div>
      <hr style="border:none; border-top:1px solid #C1BFC0; margin:0 24px;">
      <!-- Content -->
      <div style="padding:32px 24px;">
        <p style="color:#252020; font-size:16px; margin-top:0;"><strong>Hola,</strong></p>
        <p style="color:#252020; font-size:16px; line-height:1.6;">
          Te informamos que la dirección de correo electrónico asociada a tu cuenta ha sido cambiada recientemente.
        </p>
        <div style="background:#f9f9f9; padding:16px; border-radius:6px; margin:24px 0;">
          <p style="margin:0; font-size:14px; color:#666;">Correo anterior:</p>
          <p style="margin:4px 0 16px 0; font-weight:bold; color:#252020;">${oldEmail}</p>
          <p style="margin:0; font-size:14px; color:#666;">Correo nuevo:</p>
          <p style="margin:4px 0 0 0; font-weight:bold; color:#252020;">${newEmail}</p>
        </div>
        <p style="color:#252020; font-size:14px; line-height:1.6; color:#d93025; font-weight:bold;">
          Si no fuiste tú quien realizó este cambio, por favor ponte en contacto con nuestro equipo de soporte de inmediato o intenta restablecer tu contraseña desde la página principal.
        </p>
      </div>
      <!-- Footer -->
      <div style="background:#f2b6c1; padding:20px 24px;">
        <p style="margin:0; font-size:13px; color:#252020;">Saludos,<br> <strong>Equipo Estilos Boom</strong></p>
      </div>
    </div>
  </body>
</html>
      `,
    };

    try {
      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error(`Failed to send email change notification: ${error.message}`);
    }
  }

  async sendPasswordResetLink(dto: CreatePasswordResetLinkMailDto) {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: dto.to,
      subject: 'Recuperación de contraseña - Estilos Boom',
      text: `Hola,\n\nHemos recibido una solicitud para restablecer tu contraseña.\nPor favor, haz clic en el siguiente enlace para crear una nueva contraseña:\n\n${dto.link}\n\nSi no solicitaste este cambio, puedes ignorar este correo.\n\nSaludos,\nEquipo Estilos Boom`,
      html: `
       <html>
  <head>
  </head>
  <body style="margin:0; padding:0; background:#ffffff; font-family: Arial, sans-serif;">

    <!-- Wrapper -->
    <div style="
      max-width:560px;
      margin:24px auto;
      background:#ffffff;
      border:1px solid #C1BFC0;
    ">

      <!-- Header with image -->
      <div style="padding:32px 24px; text-align:center;">
        <img 
          src="https://i.postimg.cc/GtGzCjqh/meta-icon.png" 
          alt="Estilos Boom" 
          width="64"
          style="display:block; margin:0 auto 16px;"
        />
        <h1 style="margin:0; font-size:24px; color:#252020; font-weight:700;">
          Recuperación de contraseña
        </h1>
      </div>

      <hr style="border:none; border-top:1px solid #C1BFC0; margin:0 24px;">

      <!-- Content -->
      <div style="padding:32px 24px;">
        <p style="color:#252020; font-size:16px; margin-top:0;">
          Hola,
        </p>

        <p style="color:#252020; font-size:16px; line-height:1.6;">
          Recibimos una solicitud para restablecer tu contraseña.
          Para continuar con el proceso, presiona el siguiente botón:
        </p>

        <div style="text-align:center; margin:36px 0;">
          <a 
            href="${dto.link}"
            style="
              display:inline-block;
              background:#f2b6c1;
              color:#252020;
              padding:14px 32px;
              border-radius:6px;
              text-decoration:none;
              font-weight:700;
              font-size:16px;
            "
          >
            Restablecer contraseña
          </a>
        </div>

        <p style="color:#252020; font-size:14px; line-height:1.6;">
          Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f2b6c1; padding:20px 24px;">
        <p style="margin:0; font-size:13px; color:#252020;">
          Saludos,<br>
          <strong>Equipo Estilos Boom</strong>
        </p>
      </div>

    </div>

  </body>
</html>
      `,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  async sendTemporalCredentials(dto: CreateTemporalCredentialMailDto) {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: dto.to,
      subject: 'Credenciales Level Music Corp',
      text: `Hola,\n\nTus credenciales de acceso son:\n• Email: ${dto.email}\n• Contraseña temporal: ${dto.password}\n\nEntra en https://estilos-boom-web.vercel.app//. La primera vez que ingreses, solo tendrás que cambiar tu contraseña (tu email permanecerá igual).\nEquipo Estilos Boom\nhttps://estilos-boom-web.vercel.app/\n\n¡Bienvenido!`,
      html: `<html>
  <head></head>
  <body style="margin:0; padding:0; background:#ffffff; font-family: Arial, sans-serif;">

    <!-- Wrapper -->
    <div style="
      max-width:560px;
      margin:24px auto;
      background:#ffffff;
      border:1px solid #C1BFC0;
    ">

      <!-- Header -->
      <div style="padding:32px 24px; text-align:center;">
        <img 
          src="https://i.postimg.cc/GtGzCjqh/meta-icon.png" 
          alt="Estilos Boom" 
          width="64"
          style="display:block; margin:0 auto 16px;"
        />
        <h1 style="margin:0; font-size:24px; color:#252020; font-weight:700;">
          Credenciales de acceso
        </h1>
      </div>

      <hr style="border:none; border-top:1px solid #C1BFC0; margin:0 24px;">

      <!-- Content -->
      <div style="padding:32px 24px;">
        <p style="color:#252020; font-size:16px; margin-top:0;">
          Hola,
        </p>

        <p style="color:#252020; font-size:16px; line-height:1.6;">
          Tus credenciales de acceso han sido generadas correctamente:
        </p>

        <div style="margin:24px 0; font-size:16px; color:#252020;">
          <p style="margin:8px 0;">
            <strong>Email:</strong> 
            <a href="mailto:${dto.email}" style="color:#252020;">
              ${dto.email}
            </a>
          </p>

          <p style="margin:8px 0;">
            <strong>Contraseña temporal:</strong> 
            <span style="color:#252020;">
              ${dto.password}
            </span>
          </p>
        </div>

        <p style="color:#252020; font-size:16px; line-height:1.6;">
          Puedes ingresar desde el siguiente enlace:
          <br><br>
          <a 
            href="https://estilos-boom-web.vercel.app/" 
            style="color:#252020; font-weight:700;"
          >
            https://estilos-boom-web.vercel.app/
          </a>
        </p>

        <p style="color:#252020; font-size:14px; line-height:1.6;">
          Por seguridad, deberás cambiar tu contraseña en tu primer inicio de sesión.
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f2b6c1; padding:20px 24px;">
        <p style="margin:0; font-size:13px; color:#252020;">
          Saludos,<br>
          <strong>Equipo Estilos Boom</strong>
        </p>
      </div>

    </div>

  </body>
</html>
      `,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      throw new Error(`Failed to send temporal credentials email: ${error.message}`);
    }
  }
}
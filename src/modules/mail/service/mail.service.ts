import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import {
  CreatePasswordResetLinkMailDto,
} from '../dto';

@Injectable()
export class MailService {
  private oauth2Client;
  private transporter;

  constructor(
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.setupTransporter();
  }

  private async setupTransporter() {
    const accessToken = await this.oauth2Client.getAccessToken();
    if (!accessToken) {
      throw new Error('Failed to retrieve access token');
    }

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
  <body style="margin:0; padding:0; background:#DFE0E2; font-family: Arial, sans-serif;">

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
}
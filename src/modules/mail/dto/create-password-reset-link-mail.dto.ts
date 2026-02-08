import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreatePasswordResetLinkMailDto {
  @ApiProperty({
    example: 'usuario@correo.com',
    description: 'Correo del destinatario.',
  })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    example: 'https://level-music.app/reset-password?token=abc123',
    description: 'Enlace único para restablecer la contraseña.',
  })
  @IsString()
  @IsNotEmpty()
  link: string;
}
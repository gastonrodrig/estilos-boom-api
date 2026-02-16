import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateTemporalCredentialMailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email del destinatario',
  })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Correo electrónico del usuario',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Contraseña temporal para el usuario',
  })
  @IsNotEmpty()
  password: string;
}

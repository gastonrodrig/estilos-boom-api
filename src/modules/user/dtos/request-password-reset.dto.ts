import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'cliente@correo.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

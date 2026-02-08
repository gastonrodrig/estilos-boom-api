import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { CreateFirebaseUserDto } from '../dto/create-firebase-user.dto';
import { UpdateFirebaseUserDto } from '../dto/update-firebase-user.dto';
import { Public } from 'src/auth/decorators';

@Controller('firebase-auth')
@ApiTags('Firebase-Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar usuario con email y contraseña' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Usuario creado correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al crear el usuario.',
  })
  async registerWithEmail(
    @Body() createFirebaseUserDto: CreateFirebaseUserDto,
  ) {
    return this.authService.createUserWithEmail(createFirebaseUserDto);
  }

  @Patch(':uid')
  @Public()
  @ApiOperation({
    summary: 'Actualizar solo el correo de un usuario en Firebase',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Correo actualizado correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al actualizar el correo.',
  })
  async updateUserEmail(
    @Param('uid') uid: string,
    @Body() updateFirebaseUserDto: UpdateFirebaseUserDto,
  ) {
    return this.authService.updateUserEmail(uid, updateFirebaseUserDto);
  }
}

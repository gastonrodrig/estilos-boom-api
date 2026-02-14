import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FirebaseAuthGuard } from 'src/auth/guards';
import { ClientService } from '../services';
import { 
  CreateClientLandingDto, 
  RequestPasswordResetDto,
  UpdateExtraDataDto, 
} from '../dtos';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';


@ApiTags('Clients')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'El usuario ha sido creado correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al crear el usuario.',
  })
  @ApiOperation({ summary: 'Create client (landing)' })
  create(@Body() dto: CreateClientLandingDto) {
    return this.clientService.createClientLanding(dto);
  }

  @Get('find/:email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener un usuario por Email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'El usuario ha sido obtenido correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al obtener el usuario.',
  })
  findByEmail(@Param('email') email: string) {
    return this.clientService.findByEmail(email);
  }

  @Get('validate-email/:email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar si un correo ya fue registrado previamente' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'El correo no está registrado.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'El correo ya fue registrado previamente.',
  })
  validateEmailNotRegistered(@Param('email') email: string) {
    return this.clientService.validateEmailNotRegistered(email);
  }

  @Patch('reset-password-flag/:uid')
  // @UseGuards(FirebaseAuthGuard)
  // @ApiBearerAuth('firebase-auth')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resetear el flag de cambio de contraseña para un usuario',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'El flag de cambio de contraseña ha sido reseteado correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al resetear el flag de cambio de contraseña.',
  })
  resetPasswordChangeFlag(@Param('uid') id: string) {
    return this.clientService.resetPasswordChangeFlag(id);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar enlace de reseteo de contraseña' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Si el correo pertenece a un cliente válido, se enviará el enlace.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al solicitar el enlace de reseteo de contraseña.',
  })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.clientService.sendPasswordResetEmail(dto.email);
  }

  @Patch('extra-data/:uid')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth('firebase-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar información extra de un usuario por uid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'La información extra del usuario ha sido actualizada correctamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error al actualizar la información extra del usuario.',
  })
  async updateExtraData(
    @Param('uid') auth_id: string,
    @Body() UpdateExtraDataDto: UpdateExtraDataDto,
  ) {
    return this.clientService.updateUserExtraData(auth_id, UpdateExtraDataDto);
  }
}
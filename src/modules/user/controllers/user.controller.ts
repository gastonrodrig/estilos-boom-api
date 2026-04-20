import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Public, AuthRoles } from 'src/auth/decorators';
import { ROLE_PERMISSIONS, Roles } from 'src/core/constants/app.constants';

@ApiTags('Users')
@Controller('client/users')
export class UserController {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>
    ) { }

    @Public()
    @Get()
    @ApiOperation({ summary: 'Listar todos los usuarios del sistema (Compass)' })
    async findAll() {
        return this.userModel.find().exec();
    }

    @ApiBearerAuth('firebase-auth')
    @AuthRoles(Roles.ADMIN)
    @Get('roles-permissions')
    @ApiOperation({ summary: 'Obtener la configuración maestra de roles y permisos' })
    async getRolesPermissions() {
        return ROLE_PERMISSIONS;
    }
}

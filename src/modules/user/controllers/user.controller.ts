import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserManagementService } from '../services/user-management.service';
import { Public, AuthRoles } from 'src/auth/decorators';
import { Roles } from 'src/core/constants/app.constants';

@ApiTags('Users')
@Controller('client/users')
export class UserController {
    constructor(
        private readonly roleService: UserManagementService
    ) { }

    @Public()
    @Get()
    @ApiOperation({ summary: 'Listar todos los usuarios del sistema' })
    async findAll() {
        return this.roleService.findAllUsers();
    }

    @Public()
    @Get('roles-permissions')
    @ApiOperation({ summary: 'Listar roles del sistema con conteo de usuarios asignados' })
    async getRolesPermissions() {
        return this.roleService.getRolesPermissions();
    }
}

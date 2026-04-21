import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleManagementService } from '../services/role-management.service';
import { Public, AuthRoles } from 'src/auth/decorators';
import { Roles } from 'src/core/constants/app.constants';

@ApiTags('Users')
@Controller('client/users')
export class UserController {
    constructor(
        private readonly roleService: RoleManagementService
    ) { }

    @Public()
    @Get()
    @ApiOperation({ summary: 'Listar todos los usuarios del sistema' })
    async findAll() {
        return this.roleService.findAllUsers();
    }

    @ApiBearerAuth('firebase-auth')
    @AuthRoles(Roles.ADMIN)
    @Get('roles-permissions')
    @ApiOperation({ summary: 'Obtener roles y permisos' })
    async getRolesPermissions() {
        return this.roleService.getRolesWithMigration();
    }

    @ApiBearerAuth('firebase-auth')
    @AuthRoles(Roles.ADMIN)
    @Post('roles-permissions')
    @ApiOperation({ summary: 'Crear un nuevo rol' })
    async createRole(@Body() body: { name: string, permissions: string[] }) {
        return this.roleService.createRole(body.name, body.permissions);
    }

    @ApiBearerAuth('firebase-auth')
    @AuthRoles(Roles.ADMIN)
    @Patch('roles-permissions/:name')
    @ApiOperation({ summary: 'Actualizar permisos de un rol' })
    async updateRolePermissions(@Param('name') name: string, @Body() body: { permissions: string[] }) {
        return this.roleService.updateRolePermissions(name, body.permissions);
    }
}

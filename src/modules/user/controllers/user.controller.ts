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

}

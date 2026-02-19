import { SetMetadata } from '@nestjs/common';
import { Roles } from 'src/core/constants/app.constants';

export const ROLES_KEY = 'roles';

export const AuthRoles = (...roles: Roles[]) => SetMetadata(ROLES_KEY, roles);

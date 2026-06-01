import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Roles } from 'src/core/constants/app.constants';

@Injectable()
export class UserManagementService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>
    ) { }

    async findAllUsers() {
        return this.userModel.find().exec();
    }

    /**
     * Devuelve los roles disponibles del sistema con conteo real de usuarios.
     * No requiere una colección Role separada — los roles son el enum Roles.
     */
    async getRolesPermissions() {
        const users = await this.userModel.find().select('role').lean().exec();

        const counts: Record<string, number> = {};
        for (const u of users) {
            if (u.role) counts[u.role] = (counts[u.role] ?? 0) + 1;
        }

        return Object.values(Roles).map(roleName => ({
            name:        roleName,
            user_count:  counts[roleName] ?? 0,
            is_active:   true,
            permissions: [] as string[],
        }));
    }
}

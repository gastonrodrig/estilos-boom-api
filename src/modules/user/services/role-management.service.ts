import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Role, RoleDocument } from '../schemas/role.schema';
import { ROLE_PERMISSIONS, Roles } from 'src/core/constants/app.constants';

@Injectable()
export class RoleManagementService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Role.name) private roleModel: Model<RoleDocument>
    ) { }

    async findAllUsers() {
        return this.userModel.find().exec();
    }

    async getRolesWithMigration() {
        // Migración automática de nombres antiguos a Almacenero
        const oldRole = await this.roleModel.findOne({ name: 'Trabajador' }).exec();
        if (oldRole) {
            await this.roleModel.updateOne({ _id: oldRole._id }, { name: Roles.WORKER });
            await this.userModel.updateMany({ role: 'Trabajador' as any }, { role: Roles.WORKER });
        }

        const rolesFromDb = await this.roleModel.find({ is_active: true }).exec();

        // Inicialización (Seeder)
        if (rolesFromDb.length === 0) {
            const initialRoles = Object.keys(ROLE_PERMISSIONS).map(name => ({
                name,
                permissions: ROLE_PERMISSIONS[name]
            }));
            await this.roleModel.insertMany(initialRoles);
            return ROLE_PERMISSIONS;
        }

        const result = {};
        rolesFromDb.forEach(role => {
            const name = role.name === 'Trabajador' ? Roles.WORKER : role.name;
            result[name] = role.permissions;
        });
        return result;
    }

    async createRole(name: string, permissions: string[]) {
        const newRole = new this.roleModel({ name, permissions });
        return newRole.save();
    }

    async updateRolePermissions(name: string, permissions: string[]) {
        return this.roleModel.findOneAndUpdate(
            { name: new RegExp(`^${name}$`, 'i') },
            { permissions },
            { new: true }
        ).exec();
    }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class RoleManagementService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>
    ) { }

    async findAllUsers() {
        return this.userModel.find().exec();
    }
}

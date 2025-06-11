import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ProfileService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, private readonly jwtService: JwtService) {}

  async getUserProfile({ email }: { email: string }) {
    const existingUser = await this.userModel.findOne({ email: email })
    if (existingUser) {
      return { ...existingUser.toObject(), password: undefined, __v: undefined, _id: undefined }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }
  }

  async updateUser(email: string, updateData: Partial<User>) { 
    const existingUser = await this.userModel.findOneAndUpdate({ email }, updateData, { new: true })
    if (existingUser) {
      return  { ...existingUser.toObject(), password: undefined, __v: undefined, _id: undefined }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }
  }
}

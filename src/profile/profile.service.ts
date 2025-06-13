import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Crew } from 'src/crew/entities/crew.entity';
import { CrewDocument } from 'src/common/schemas/crew/userCrew.schema';
import { CrewService } from 'src/crew/crew.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Crew.name) private crewModel: Model<CrewDocument>,
    private crewService: CrewService,
    private readonly jwtService: JwtService) { }

  private async handleVIP(email: string) {
    const existingUser = await this.userModel.findOne({ email })
    if (!existingUser) throw new NotFoundException('user not found');
    const existingUserCrew = await this.crewService.getUserCrew(email)
    if(!existingUserCrew) throw new NotFoundException('user not found')
    if (existingUserCrew?.totalCrewDeposits >= 3000) existingUser.vip = 1
    if (existingUserCrew?.totalCrewDeposits >= 5000) existingUser.vip = 2
    if (existingUserCrew?.totalCrewDeposits >= 10000) existingUser.vip = 3

    await existingUser.save();
  }

  async getUserProfile({ email }: { email: string }) {
    const existingUser = await this.userModel.findOne({ email: email })
    if (existingUser) {
      await this.handleVIP(email);
      return { ...existingUser.toObject(), password: undefined, __v: undefined, _id: undefined }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }
  }

  async updateUser(email: string, updateData: Partial<User>) {
    const existingUser = await this.userModel.findOneAndUpdate({ email }, updateData, { new: true })
    if (existingUser) {
      await this.handleVIP(email);
      return { ...existingUser.toObject(), ...updateData, password: undefined, __v: undefined, _id: undefined }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }
  }
}

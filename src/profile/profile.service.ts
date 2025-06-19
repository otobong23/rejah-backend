import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Crew, CrewDocument } from 'src/common/schemas/crew/userCrew.schema';
import { CrewService } from 'src/crew/crew.service';
import { CreateTierDto } from './dto/create-profile.dto';
import { UserTransaction, UserTransactionDocument } from 'src/common/schemas/transaction/userTransaction.schema';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Crew.name) private crewModel: Model<CrewDocument>,
    @InjectModel(UserTransaction.name) private transactionModel: Model<UserTransactionDocument>,
    private crewService: CrewService,
    private readonly jwtService: JwtService) { }

  private async handleVIP(email: string) {
    const existingUser = await this.userModel.findOne({ email })
    if (!existingUser) throw new NotFoundException('user not found');
    const existingUserCrew = await this.crewService.getUserCrew(email)
    if (!existingUserCrew) throw new NotFoundException('user not found')
    if (existingUserCrew?.totalCrewDeposits >= 3000) existingUser.vip = 1
    if (existingUserCrew?.totalCrewDeposits >= 5000) existingUser.vip = 2
    if (existingUserCrew?.totalCrewDeposits >= 10000) existingUser.vip = 3

    await existingUser.save();
  }

  private async handleMeter(email: string) {
    const existingUser = await this.userModel.findOne({ email });
    if (!existingUser) throw new NotFoundException('User not found');
    const existingUserCrew = await this.crewService.getUserCrew(email);
    if (!existingUserCrew) throw new NotFoundException('User crew not found');
    const tc = existingUserCrew.totalCrewDeposits ?? 0;
    let meter = 0;

    if (tc < 3000) {
      meter = Math.round((tc / 3000) * 100);
    } else if (tc >= 3000 && tc < 5000) {
      meter = Math.round(((tc - 3000) / 2000) * 100);
    } else if (tc >= 5000 && tc < 10000) {
      meter = Math.round(((tc - 5000) / 5000) * 100);
    } else {
      meter = 100;
    }

    existingUser.meter = meter;
    await existingUser.save();
  }

  async getUserProfileByUserID(userID:string){
    const existingUser = await this.userModel.findOne({ userID })
    if (!existingUser) throw new NotFoundException('User not Found');
    return { ...existingUser.toObject(), password: undefined, __v: undefined, _id: undefined }
  }

  async getUserProfile({ email }: { email: string }) {
    const existingUser = await this.userModel.findOne({ email: email })
    if (existingUser) {
      await this.handleVIP(email);
      await this.handleMeter(email)
      return { ...existingUser.toObject(), password: undefined, __v: undefined, _id: undefined }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }
  }

  async deleteUser(email:string) {
    const existingUser = await this.userModel.findOne({ email })
    if(!existingUser) throw new NotFoundException('User not Found, please signup');
    await this.transactionModel.deleteMany({ email })
    await this.crewModel.findOneAndDelete({ userID: existingUser.userID })
    await this.userModel.findOneAndDelete({ email })
    return { message: 'user deleted successfully' }
  }

  async updateUser(email: string, updateData: Partial<User>) {
    const existingUser = await this.userModel.findOneAndUpdate({ email }, updateData, { new: true })
    if (existingUser) {
      await this.handleVIP(email);
      await this.handleMeter(email)
      return { ...existingUser.toObject(), ...updateData, password: undefined, __v: undefined, _id: undefined }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }
  }

  async updateCurrentPlan(email, newPlan: Partial<CreateTierDto>) {
    const existingUser = await this.userModel.findOneAndUpdate({ email }, {$push: { currentPlan: newPlan } }, { new: true })
    if (!existingUser) throw new NotFoundException('User not Found, please signup');
    await this.handleVIP(email);
    await this.handleMeter(email)
    return { ...existingUser.toObject(), password: undefined, __v: undefined, _id: undefined }

  }
}

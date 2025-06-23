import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AdminLoginDto, UpdateTransactionDto } from './dto/create-admin.dto';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument, UserModel } from 'src/common/schemas/user/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserTransaction, UserTransactionDocument } from 'src/common/schemas/transaction/userTransaction.schema';
import { Crew, CrewDocument, CrewModel } from 'src/common/schemas/crew/userCrew.schema';
import { CrewService } from 'src/crew/crew.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { ProfileService } from 'src/profile/profile.service';
import { Admin, AdminDocument } from 'src/common/schemas/admin/userAdmin.schema';
import { sendTransactionStatus } from 'src/common/helpers/mailer';
import { UpdateProfileDto } from 'src/profile/dto/update-profile.dto';


@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    @InjectModel(User.name) private userModel: UserModel,
    @InjectModel(UserTransaction.name) private transactionModel: Model<UserTransactionDocument>,
    @InjectModel(Crew.name) private crewModel: CrewModel,
    private jwtService: JwtService,
    private crewService: CrewService,
    private transactionService: TransactionService,
    private profileService: ProfileService
  ) { }

  async login(adminLogindto: AdminLoginDto) {
    const EMAIL = process.env.EMAIL_USER
    if (EMAIL === adminLogindto.username) {
      const existingAdmin = await this.adminModel.findOne()
      if (!existingAdmin) {
        const newAdmin = new this.adminModel({ email: EMAIL })
        await newAdmin.save()
      }
      if (existingAdmin?.password !== adminLogindto.password) throw new UnauthorizedException('Invalid credentials');
      return {
        success: true,
        access_token: this.jwtService.sign({ email: adminLogindto.username, password: adminLogindto.password }),
        message: 'login successful'
      };
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async updateAdmin(email: string, updateData: Partial<Admin>) {
    const existingAdmin = await this.adminModel.findOneAndUpdate({ email }, updateData, { new: true })
    if (existingAdmin) {
      return { ...existingAdmin.toObject(), ...updateData, __v: undefined, _id: undefined }
    } else {
      throw new NotFoundException('Admin not Found, please signup')
    }
  }

  async getAdmin(email) {
    const existingAdmin = await this.adminModel.findOne({ email })
    if (!existingAdmin) throw new NotFoundException('Admin not Found, please signup')
    return { ...existingAdmin.toObject(), __v: undefined, _id: undefined }
  }

  async getTotalCrews() {
    return await this.crewModel.countDocuments()
  }

  async getAllCrews(limit = 50, page = 1) {
    const offset = (page - 1) * limit;

    const [crews, total] = await Promise.all([
      this.crewModel.find().skip(offset).limit(limit).exec(),
      this.crewModel.countDocuments()
    ]);

    if (!total) throw new NotFoundException('No Crew Found');

    return {
      crews,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }


  async getUserCrew(userID: string) {
    const user = await this.userModel.findOne({ userID })
    if (!user) throw new NotFoundException('User Not Found')
    return this.crewService.getCrew(userID)
  }

  async getTotalUsers() {
    return await this.userModel.countDocuments()
  }

  async getAllUsers(limit = 50, page = 1) {
    const offset = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel.find().skip(offset).limit(limit).exec(),
      this.userModel.countDocuments()
    ]);
    if (!total) throw new NotFoundException('No User Found')
    return {
      users,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUser(email: string) {
    return this.profileService.getUserProfile({ email })
  }

  async getUserByuserID(userID: string) {
    return this.profileService.getUserProfileByUserID(userID)
  }

  async getTransactions(limit: number = 50, page: number = 1) {
    const offset = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.transactionModel.find({ type: { $in: ['withdrawal', 'deposit'] } })
        .sort({ date: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.transactionModel.countDocuments({ type: { $in: ['withdrawal', 'deposit'] } })
    ]);
    return {
      transactions,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total
    };
  }

  async updateUser(email: string, updateData: UpdateProfileDto) {
    const existingUser = await this.userModel.findOneAndUpdate({ email }, updateData, { new: true })
    if (!existingUser) throw new NotFoundException('User not Found, please signup')
    return { ...existingUser.toObject(), ...updateData, password: undefined, __v: undefined, _id: undefined }
  }

  private async useUserBalance(email: string, amount: number, action: 'minus' | 'add') {
    const existingUser = await this.userModel.findOne({ email });
    if (!existingUser) {
      throw new NotFoundException('User not Found, please signup');
    }
    if (action === 'minus') {
      if (existingUser.balance < amount) {
        throw new BadRequestException('Insufficient balance for withdrawal');
      }
      existingUser.balance -= amount;
      existingUser.totalWithdraw += amount;
    } else if (action === 'add') {
      existingUser.balance += amount;
      existingUser.totalDeposit += amount;
    } else {
      throw new BadRequestException('Invalid action type');
    }
    await existingUser.save();
  }
  private async updateAdminTotals(type: 'deposit' | 'withdrawal', amount: number) {
    const admin = await this.adminModel.findOne(); // Assumes single admin account
    if (!admin) throw new NotFoundException('Admin not found');

    if (type === 'deposit') {
      admin.totalDeposit += amount;
    } else if (type === 'withdrawal') {
      admin.totalWithdraw += amount;
    }

    await admin.save();
  }

  async updateTransaction(email: string, transactionID: string, updateData: UpdateTransactionDto) {
    const transaction = await this.transactionModel.findOne({ email, _id: transactionID });
    const existingUser = await this.userModel.findOne({ email });

    if (!transaction) throw new NotFoundException('Transaction not found or not authorized');
    if (!existingUser) throw new NotFoundException('User not found or not authorized');
    if (transaction.status !== 'pending') {
      throw new BadRequestException('Only pending transactions can be updated');
    }

    const isNowCompleted = updateData.status === 'completed';
    transaction.status = updateData.status;
    if (updateData.image) {
      transaction.image = updateData.image;
    }
    if (updateData.status === 'failed') {
      const reason = 'The transaction was not approved.';
      const info = await sendTransactionStatus(
        email,
        email,
        transaction.amount,
        transactionID,
        transaction.type,
        'declined',
        reason
      );
      if (!info) {
        throw new InternalServerErrorException(`Failed to send decline email to ${email}`);
      }
      return await transaction.save();
    }
    if (isNowCompleted) {
      if (typeof updateData.amount !== 'number' || !updateData.action) {
        throw new BadRequestException('Amount and action are required when completing a transaction');
      }
      if (transaction.type === 'deposit' || transaction.type === 'withdrawal') {
        const reason = '';

        const info = await sendTransactionStatus(
          email, // recipient
          email, // shown email in the email body
          updateData.amount,
          transactionID,
          transaction.type,
          'approved',
          reason,
        );

        if (!info) {
          throw new InternalServerErrorException(`Failed to send transaction status email to ${email}`);
        }
        await this.useUserBalance(email, updateData.amount, updateData.action);
        if (transaction.type === 'deposit') {
          if (existingUser.oneTimeBonus) {
            await this.crewService.awardReferralBonus(existingUser.userID, updateData.amount, "first_deposit");
            existingUser.oneTimeBonus = false
          }
          await this.crewService.updateCrewOnTransaction(existingUser.userID, "deposit", updateData.amount)
        } else this.crewService.updateCrewOnTransaction(existingUser.userID, "withdraw", updateData.amount);
        await this.updateAdminTotals(transaction.type, updateData.amount);
      } else {
        throw new BadRequestException('Invalid transaction type');
      }
    }

    return await transaction.save();
  }

  async searchUsers(keyword: string): Promise<UserDocument[]> {
    return this.userModel.search(keyword);
  }

  async searchCrews(keyword: string): Promise<CrewDocument[]> {
    return this.crewModel.search(keyword);
  }
}

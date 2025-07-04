import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DepositDto, WithdrawDto } from './dto/transaction.dto';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { sendMail } from 'src/common/helpers/mailer';
import { UserTransaction, UserTransactionDocument } from 'src/common/schemas/transaction/userTransaction.schema';
import { CrewService } from 'src/crew/crew.service';
import { config } from 'dotenv';
config()

const DEPOSIT_WALLET = 'TFcGAio7carxRnPCeVmZgCqe2AnpvPtqAf';
const to = process.env.EMAIL_USER

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserTransaction.name) private readonly transactionModel: Model<UserTransactionDocument>,
    private crewService: CrewService
  ) { }

  private async findUserByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('User not found. Please sign up.');
    }
    return user;
  }


  async deposit(depositDto: DepositDto, email: string) {
    const existingUser = await this.userModel.findOne({ email });

    if (!existingUser) throw new NotFoundException('User not found. Please sign up.');

    if (existingUser.ActivateBot) {

      const { amount } = depositDto;
      const newTransaction = new this.transactionModel({ transactionID: depositDto.transactionID, email, type: 'deposit', amount, image: depositDto.image, status: 'pending', date: new Date() }) as UserTransactionDocument & { _id: any };

      await newTransaction.save();
      const mailSent = await sendMail(to, existingUser.email, Number(amount), newTransaction._id.toString(), 'deposit')
      // await this.crewService.updateCrewOnTransaction(existingUser.userID, "deposit", amount)
      if (!mailSent) {
        throw new InternalServerErrorException('Failed to send Review email')
      }
      return { message: 'Deposit request submitted successfully', newTransaction }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }

  }

  async withdraw(withdrawDto: WithdrawDto, email: string) {
    const { walletAddress, amount } = withdrawDto;
    const existingUser = await this.userModel.findOne({ email })
    if (existingUser) {
      if (existingUser.ActivateBot) {
        existingUser.withdrawalWallet = { walletAddress, amount: Number(amount) }
        existingUser.withdrawStatus = 'pending';
        if (existingUser.balance < amount) {
          throw new InternalServerErrorException('Insufficient balance for withdrawal')
        }

        const newTransaction = new this.transactionModel({ email, type: 'withdrawal', amount, status: 'pending', withdrawWalletAddress: walletAddress, date: new Date() }) as UserTransactionDocument & { _id: any };
        await newTransaction.save();
        const percent = Number(amount) * 0.9
        const mailSent = await sendMail(to, existingUser.email, percent, newTransaction._id.toString(), 'withdrawal')
        if (!mailSent) {
          throw new InternalServerErrorException('Failed to send withdrawal Confirmation email')
        }

        await existingUser.save();
        // await this.crewService.updateCrewOnTransaction(existingUser.userID, "withdraw", amount)
        return { message: 'Withdrawal request submitted successfully', newTransaction }
      } else {
        throw new ConflictException('Your account has been suspended. Please Vist Customer Care')
      }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }
  }

  async getTransactionHistory(email: string, limit: number = 50, page: number = 1) {
    limit = Math.max(1, Math.min(limit, 100))
    page = Math.max(1, page)
    const offset = (page - 1) * limit;
    
    const user = await this.findUserByEmail(email);

    const transactions = await this.transactionModel
      .find({ email })
      .sort({ date: -1 })
      .limit(limit)
      .skip(offset)
      .exec();

    const total = await this.transactionModel.countDocuments({ email })
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    return {
      transactions,
      page,
      total,
      totalPages,
      user: {
        email: user.email,
        balance: user.balance,
      },
    };
  }

  async mine(email: string, amount: number) {
    const existingUser = await this.findUserByEmail(email);
    if (!existingUser) throw new NotFoundException('User not Found, please signup');
    if (existingUser.ActivateBot) {
      existingUser.balance += amount;
      existingUser.totalYield += amount;
      await this.crewService.awardReferralBonus(existingUser.userID, amount, "mining_profit")
      const newTransaction = new this.transactionModel({ email, type: 'yield', amount, status: 'completed', date: new Date() })
      await newTransaction.save()
      await existingUser.save();
      return existingUser.balance;
    } else {
      throw new ConflictException('Your account has been suspended. Please Vist Customer Care')
    }
  }

  async getPlan(email: string, amount: number, plan: string) {
    const existingUser = await this.findUserByEmail(email);
    if (!existingUser) throw new NotFoundException('User not Found, please signup');
    if (existingUser.ActivateBot) {
      if (existingUser.balance < amount) {
        throw new InternalServerErrorException('Insufficient balance for withdrawal');
      }
      existingUser.balance -= amount;
      const newTransaction = new this.transactionModel({ email, type: 'tier', amount, plan, status: 'completed', date: new Date() })
      await newTransaction.save()
      await existingUser.save();
      return existingUser.balance;
    } else {
      throw new ConflictException('Your account has been suspended. Please Vist Customer Care')
    }
  }
}

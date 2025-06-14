import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { DepositDto, WithdrawDto } from './dto/transaction.dto';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { sendMail } from 'src/common/helpers/mailer';
import { UserTransaction, UserTransactionDocument } from 'src/common/schemas/transaction/userTransaction.schema';
import { CrewService } from 'src/crew/crew.service';
import { config } from 'dotenv';
config()

const DEPOSIT_WALLET = 'TFcGAio7carxRnPCeVmZgCqe2AnpvPtqAf';
const TRONGRID_API_URL = `https://api.trongrid.io/v1/accounts/${DEPOSIT_WALLET}/transactions/trc20`;
const USDT_DECIMALS = 1e6;
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

    if (!existingUser) {
      throw new NotFoundException('User not found. Please sign up.');
    }

    const { amount } = depositDto;
    const newTransaction = new this.transactionModel({ email, type: 'deposit', amount, status: 'pending', date: new Date() }) as UserTransactionDocument & { _id: any };

    await newTransaction.save();
    const mailSent = await sendMail(to, existingUser.email, Number(amount), newTransaction._id.toString(), 'deposit')
    if (!mailSent) {
      throw new InternalServerErrorException('Failed to send Review email')
    }
    await this.crewService.updateCrewOnTransaction(existingUser.userID, "deposit", amount)
    return { message: 'Deposit successfully', newTransaction }
  }

  async withdraw(withdrawDto: WithdrawDto, email: string) {
    const { walletAddress, amount } = withdrawDto;
    const existingUser = await this.userModel.findOne({ email })
    if (existingUser) {
      existingUser.withdrawalWallet = { walletAddress, amount: Number(amount) }
      existingUser.withdrawStatus = 'pending';
      if (existingUser.balance < amount) {
        throw new InternalServerErrorException('Insufficient balance for withdrawal')
      }

      const newTransaction = new this.transactionModel({ email, type: 'withdrawal', amount, status: 'pending', date: new Date() }) as UserTransactionDocument & { _id: any };
      await newTransaction.save();
      const mailSent = await sendMail(to, existingUser.email, Number(amount), newTransaction._id.toString(), 'withdrawal')
      if (!mailSent) {
        throw new InternalServerErrorException('Failed to send withdrawal Confirmation email')
      }

      await existingUser.save();
      await this.crewService.updateCrewOnTransaction(existingUser.userID, "withdraw", amount)
      return { message: 'Withdrawal request submitted successfully', newTransaction }
    } else {
      throw new NotFoundException('User not Found, please signup')
    }
  }

  async getTransactionHistory(email: string, limit: number = 50, offset: number = 0) {
    const user = await this.findUserByEmail(email);

    const transactions = await this.transactionModel
      .find({ email })
      .sort({ date: -1 })
      .limit(limit)
      .skip(offset)
      .exec();

    return {
      transactions,
      total: await this.transactionModel.countDocuments({ email }),
      user: {
        email: user.email,
        balance: user.balance,
      },
    };
  }
}

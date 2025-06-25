import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { Model, Connection, ClientSession } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Crew, CrewDocument, CrewMember } from 'src/common/schemas/crew/userCrew.schema';
import { UserTransaction, UserTransactionDocument } from 'src/common/schemas/transaction/userTransaction.schema';

@Injectable()
export class CrewService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserTransaction.name) private transactionModel: Model<UserTransactionDocument>,
    @InjectModel(Crew.name) private crewModel: Model<CrewDocument>,
    @InjectConnection() private readonly db: Connection,
    private readonly jwtService: JwtService
  ) { }

  private async findReferrer(referral_code: string) {
    const referrer = await this.userModel.findOne({ referral_code: referral_code });
    if (!referrer) {
      throw new BadRequestException('Invalid referral code');
    }
    return referrer
  }

  /**
   * @author Miracle Boniface
   * @module CrewService
   * @param {string} referralCode 
   * @param {UserDocument} user 
   * @function updateCrew
   * @description updates referrers crew up to 3rd level
   * @export
   */
  async updateCrew(referralCode: string, user: UserDocument) {
    let currentRefCode = referralCode;
    let level = 1;

    while (currentRefCode && level <= 3) { // Set max depth if desired
      const referrer = await this.findReferrer(currentRefCode);
      const referrerCrew = await this.crewModel.findOne({ userID: referrer.userID });
      if (!referrerCrew) break;

      const crewMember: CrewMember = {
        userID: user.userID,
        username: user.username,
        level,
        totalDeposits: user.totalDeposit,
        totalWithdrawals: user.totalWithdraw,
        transactionCount: user.transactionCount,
        currentPlan: user.currentPlan.map(item => item.title),
      };

      const levelKey = `level_${level}` as keyof Crew;
      if (Array.isArray(referrerCrew[levelKey])) {
        (referrerCrew[levelKey] as CrewMember[]).push(crewMember);
      } else {
        (referrerCrew as any)[levelKey] = [crewMember];
      }

      referrerCrew.totalMembers += 1;
      referrerCrew.totalCrewDeposits += user.totalDeposit;
      referrerCrew.totalCrewWithdrawals += user.totalWithdraw;
      referrerCrew.totalCrewTransactions += user.transactionCount;
      referrerCrew.lastUpdated = new Date();

      await referrerCrew.save();

      currentRefCode = referrer.referredBy ?? '';
      level++;
    }
  }

  /**
   * @author Miracle Boniface
   * @module CrewService
   * @param {UserDocument} user 
   * @function createCrew
   * @description create crew new registered user
   * @export
   */
  async createCrew(user: UserDocument) {
    const existing = await this.crewModel.findOne({ userID: user.userID });
    if (existing) return;

    const newCrew = new this.crewModel({
      userID: user.userID,
      ownerUsername: user.username,
      ownerReferralCode: user.referral_code,
      level_1: [],
      level_2: [],
      level_3: [],
      totalMembers: 0,
      totalCrewDeposits: 0,
      totalCrewWithdrawals: 0,
      totalCrewTransactions: 0,
    });
    await newCrew.save();
  }

  async getCrew(userID: string) {
    const crew = await this.crewModel.findOne({ userID });
    if (!crew) return null

    return {
      totalMembers: crew.totalMembers,
      totalCrewDeposits: crew.totalCrewDeposits,
      totalCrewWithdrawals: crew.totalCrewWithdrawals,
      totalCrewTransactions: crew.totalCrewTransactions,
      members: {
        level_1: crew.level_1,
        level_2: crew.level_2,
        level_3: crew.level_3,
      }
    };
  }

  async getUserCrew(email) {
    const existingUser = await this.userModel.findOne({ email })
    if (!existingUser) throw new NotFoundException('User not found, Login please');
    return this.getCrew(existingUser.userID)
  }



  async updateCrewOnTransaction(userID: string, transactionType: 'deposit' | 'withdraw', amount: number) {
    const user = await this.userModel.findOne({ userID });
    if (!user) throw new NotFoundException('User not found');

    let currentRefCode = user.referredBy;
    let level = 1;

    while (currentRefCode && level <= 10) {
      const referrer = await this.userModel.findOne({ referral_code: currentRefCode });
      if (!referrer) break;

      const crew = await this.crewModel.findOne({ userID: referrer.userID });
      if (!crew) break;

      const levelKey = `level_${level}` as keyof Crew;
      const crewMembers = (crew[levelKey] || []) as CrewMember[];

      const memberIndex = crewMembers.findIndex(m => m.userID === user.userID);
      if (memberIndex > -1) {
        // Update existing member stats
        const member = crewMembers[memberIndex];
        if (transactionType === 'deposit') {
          member.totalDeposits += amount;
          crew.totalCrewDeposits += amount;
        } else {
          member.totalWithdrawals += amount;
          crew.totalCrewWithdrawals += amount;
        }

        member.transactionCount += 1;
        crew.totalCrewTransactions += 1;

        crewMembers[memberIndex] = member;
        (crew as any)[levelKey] = crewMembers;
        crew.lastUpdated = new Date();

        await crew.save();
      }

      currentRefCode = referrer.referredBy;
      level++;
    }
  }


  /**
 * @author Miracle Boniface
 * @module CrewService
 * @param {string} userID - ID of the user
 * @param {number} amount - Transaction amount
 * @param {'first_deposit' | 'mining_profit'} bonusType - Type of bonus to award
 * @param {string} coin - Coin type (default: 'USDT')
 * @function awardReferralBonus
 * @description Generic function to award referral bonuses (alternative approach)
 * @export
 */
  async awardReferralBonus(userID: string, amount: number, bonusType: 'first_deposit' | 'mining_profit', coin: string = 'USDT') {
    const user = await this.userModel.findOne({ userID });
    if (!user || !user.referredBy) return;

    const bonusPercentages = [0.05, 0.03, 0.01]; // 5%, 3%, 1%
    const bonusTypeMap = {
      'first_deposit': 'Deposit',
      'mining_profit': 'Mining'
    };

    let currentRefCode: string | undefined = user.referredBy;
    let level = 1;

    while (currentRefCode && level <= 3) {
      const referrer = await this.userModel.findOne({ referral_code: currentRefCode });
      // 🔒 Skip if no referrer or if they haven't deposited yet
      if (!referrer || referrer.totalDeposit <= 0) {
        currentRefCode = referrer?.referredBy;
        level++;
        continue;
      }
      const bonusAmount = amount * bonusPercentages[level - 1];
      // ✅ Add bonus to referrer's balance
      referrer.balance = (referrer.balance || 0) + bonusAmount;
      await referrer.save();
      // 🧾 Create transaction record for the bonus
      const bonusTransaction = new this.transactionModel({
        email: referrer.email,
        type: 'bonus',
        amount: bonusAmount,
        status: 'completed',
        Coin: coin,
        date: new Date(),
      });
      await bonusTransaction.save();

      console.log(`✅ Awarded ${bonusAmount} ${bonusType} bonus to ${referrer.username} (Level ${level})`);

      currentRefCode = referrer.referredBy;
      level++;
    }
  }
}

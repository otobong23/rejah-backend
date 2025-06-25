import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { Model, Connection, ClientSession } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Crew, CrewDocument, CrewMember } from 'src/common/schemas/crew/userCrew.schema';
import { UserTransaction, UserTransactionDocument } from 'src/common/schemas/transaction/userTransaction.schema';
import { CrewService } from './crew.service';


@Injectable()
export class CrewExtraService {
   constructor(
      @InjectModel(User.name) private userModel: Model<UserDocument>,
      @InjectModel(UserTransaction.name) private transactionModel: Model<UserTransactionDocument>,
      @InjectModel(Crew.name) private crewModel: Model<CrewDocument>,
      @InjectConnection() private readonly db: Connection,
      private readonly crewService: CrewService,
      private readonly jwtService: JwtService
   ) { }

   /**
  * @author Miracle Boniface
  * @module CrewService
  * @param {string} userID - ID of the user to delete
  * @function deleteUser
  * @description Deletes a user, their crew, and removes them from all other crews
  * @export
  */
   async deleteUser(userID: string) {
      try {
         // 1. Find the user to be deleted
         const userToDelete = await this.userModel.findOne({ userID });
         if (!userToDelete) {
            throw new NotFoundException('User not found');
         }

         // 2. Delete the user's own crew (if they have one)
         const userCrew = await this.crewModel.findOne({ userID });
         if (userCrew) {
            await this.crewModel.deleteOne({ userID });
            console.log(`✅ Deleted crew for user: ${userToDelete.username}`);
         }

         // 3. Remove the user from all crews they're a member of
         await this.removeUserFromAllCrews(userID, userToDelete.username);

         // 4. Delete all user's transactions
         await this.transactionModel.deleteMany({ email: userToDelete.email });
         console.log(`✅ Deleted all transactions for user: ${userToDelete.username}`);

         // 5. Update referral chain - reassign referrals if needed
         await this.handleReferralChainCleanup(userToDelete);

         // 6. Finally, delete the user
         await this.userModel.deleteOne({ userID });
         console.log(`✅ Deleted user: ${userToDelete.username}`);

         return {
            success: true,
            message: `User ${userToDelete.username} and all associated data have been deleted successfully`,
            deletedData: {
               user: userToDelete.username,
               crewDeleted: !!userCrew,
               crewMembershipsRemoved: true,
               transactionsDeleted: true
            }
         };

      } catch (error) {
         console.error('❌ Error deleting user:', error);
         throw new BadRequestException(`Failed to delete user: ${error.message}`);
      }
   }

   /**
    * @author Miracle Boniface
    * @module CrewService
    * @param {string} userID - ID of the user to remove
    * @param {string} username - Username of the user to remove
    * @function removeUserFromAllCrews
    * @description Removes a user from all crews they're a member of and updates stats
    * @private
    */
   private async removeUserFromAllCrews(userID: string, username: string) {
      // Find all crews that contain this user as a member
      const crewsWithUser = await this.crewModel.find({
         $or: [
            { 'level_1.userID': userID },
            { 'level_2.userID': userID },
            { 'level_3.userID': userID }
         ]
      });

      for (const crew of crewsWithUser) {
         let memberRemoved = false;
         let removedMember: CrewMember | null = null;

         // Check and remove from level_1
         const level1Index = crew.level_1.findIndex(member => member.userID === userID);
         if (level1Index > -1) {
            removedMember = crew.level_1[level1Index];
            crew.level_1.splice(level1Index, 1);
            memberRemoved = true;
         }

         // Check and remove from level_2
         const level2Index = crew.level_2.findIndex(member => member.userID === userID);
         if (level2Index > -1) {
            removedMember = crew.level_2[level2Index];
            crew.level_2.splice(level2Index, 1);
            memberRemoved = true;
         }

         // Check and remove from level_3
         const level3Index = crew.level_3.findIndex(member => member.userID === userID);
         if (level3Index > -1) {
            removedMember = crew.level_3[level3Index];
            crew.level_3.splice(level3Index, 1);
            memberRemoved = true;
         }

         // Update crew stats if member was removed
         if (memberRemoved && removedMember) {
            crew.totalMembers = Math.max(0, crew.totalMembers - 1);
            crew.totalCrewDeposits = Math.max(0, crew.totalCrewDeposits - removedMember.totalDeposits);
            crew.totalCrewWithdrawals = Math.max(0, crew.totalCrewWithdrawals - removedMember.totalWithdrawals);
            crew.totalCrewTransactions = Math.max(0, crew.totalCrewTransactions - removedMember.transactionCount);
            crew.lastUpdated = new Date();

            await crew.save();
            console.log(`✅ Removed ${username} from ${crew.ownerUsername}'s crew`);
         }
      }
   }

   /**
    * @author Miracle Boniface
    * @module CrewService
    * @param {UserDocument} deletedUser - The user being deleted
    * @function handleReferralChainCleanup
    * @description Handles cleanup of referral chains when a user is deleted
    * @private
    */
   private async handleReferralChainCleanup(deletedUser: UserDocument) {
      // Find users who were referred by the deleted user
      const referredUsers = await this.userModel.find({ referredBy: deletedUser.referral_code });

      if (referredUsers.length > 0) {
         // Option 1: Reassign to the deleted user's referrer (if any)
         if (deletedUser.referredBy) {
            for (const referredUser of referredUsers) {
               referredUser.referredBy = deletedUser.referredBy;
               await referredUser.save();

               // Update the crew structure for the reassigned referrals
               await this.crewService.updateCrew(deletedUser.referredBy, referredUser);
            }
            console.log(`✅ Reassigned ${referredUsers.length} users to ${deletedUser.referredBy}`);
         } else {
            // Option 2: Remove referral relationship if deleted user had no referrer
            for (const referredUser of referredUsers) {
               referredUser.referredBy = undefined;
               await referredUser.save();
            }
            console.log(`✅ Removed referral relationships for ${referredUsers.length} users`);
         }
      }
   }

   /**
    * @author Miracle Boniface
    * @module CrewService
    * @param {string} email - Email of the user to delete
    * @function deleteUserByEmail
    * @description Deletes a user by email (alternative method)
    * @export
    */
   async deleteUserByEmail(email: string) {
      const user = await this.userModel.findOne({ email });
      if (!user) {
         throw new NotFoundException('User not found');
      }
      return this.deleteUser(user.userID);
   }

   /**
    * @author Miracle Boniface
    * @module CrewService
    * @param {string[]} userIDs - Array of user IDs to delete
    * @function bulkDeleteUsers
    * @description Bulk delete multiple users
    * @export
    */
   async bulkDeleteUsers(userIDs: string[]) {
      const results: Array<
         | { userID: string; success: true; result: any }
         | { userID: string; success: false; error: string }
      > = [];

      for (const userID of userIDs) {
         try {
            const result = await this.deleteUser(userID);
            results.push({ userID, success: true, result });
         } catch (error) {
            results.push({ userID, success: false, error: error.message });
         }
      }

      return {
         totalProcessed: userIDs.length,
         successful: results.filter(r => r.success).length,
         failed: results.filter(r => !r.success).length,
         results
      };
   }
}
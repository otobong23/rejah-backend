import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WithdrawalWalletDto {
  @IsString()
  walletAddress: string;

  @IsNumber()
  amount: number;
}

export class UserProfileDTO {
  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsNumber()
  totalYield?: number;

  @IsOptional()
  @IsNumber()
  totalWithdraw?: number;

  @IsOptional()
  @IsNumber()
  totalDeposit?: number;

  @IsOptional()
  @IsNumber()
  transactionCount?: number;

  @IsOptional()
  @IsString({ each: true })
  currentPlan?: string[];

  @IsOptional()
  @IsString({ each: true })
  previousPlan?: string[];

  @IsOptional()
  @IsString()
  whatsappNo?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  telegram?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  forgotPasswordCode?: string;

  @IsOptional()
  @IsNumber()
  forgotPasswordCodeValidation?: number;

  @IsOptional()
  @IsNumber()
  referral_count?: number;

  @IsOptional()
  @IsString()
  referredBy?: string;

  @IsOptional()
  @IsString()
  referral_code?: string;

  @IsOptional()
  @IsString()
  usdtWallet?: string;

  @IsOptional()
  @IsString()
  walletPassword?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WithdrawalWalletDto)
  withdrawalWallet?: WithdrawalWalletDto;

  @IsOptional()
  @IsEnum(['pending', 'completed', 'failed'])
  withdrawStatus?: 'pending' | 'completed' | 'failed';

  @IsOptional()
  @IsBoolean()
  ActivateBot?: boolean;

  @IsOptional()
  @IsNumber()
  vip?: number;

  @IsOptional()
  @IsDate()
  joinDate?: Date;
}

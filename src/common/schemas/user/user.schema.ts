

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
class withdrawalWallet {
  @Prop()
  walletAddress: string

  @Prop()
  amount: number
}

@Schema({ timestamps: true })
class depositWallet {
  @Prop()
  amount: number

  @Prop()
  coin: string

  @Prop()
  recieptImage: string
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, trim: true })
  password: string;

  @Prop({ type: Number, select: true, default: 0})
  balance: number;

  @Prop({ type: String, select: false, default: undefined })
  forgotPasswordCode?: string;

  @Prop({ type: Number, select: false, default: undefined })
  forgotPasswordCodeValidation?: number;

  @Prop({ required: true })
  referral_code?: string;

  @Prop({ default: null })
  referredBy?: string;

  @Prop({ default: 0 })
  referral_count?: number;

  @Prop({ type: withdrawalWallet })
  withdrawalWallet: withdrawalWallet;

  @Prop({ type: ['pending', 'completed', 'failed'] })
  withdrawStatus: 'pending' | 'completed' | 'failed'

  @Prop({ type: Boolean, default: false })
  ActivateBot: boolean;

  @Prop({ type: Date, default: Date.now() })
  joinDate: Date
}

export const UserSchema = SchemaFactory.createForClass(User);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserTransactionDocument = UserTransaction & Document;

@Schema({ timestamps: true })
export class UserTransaction {
  @Prop({ type: String, ref: 'user', required: true })
  email: string;

  @Prop({ required: true, enum: ['deposit', 'withdrawal', 'tier', 'bonus', 'yield'] })
  type: string;

  @Prop({ type: String })
  image: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: String })
  plan: string

  @Prop({ default: 'pending', enum: ['pending', 'completed', 'failed'] })
  status: string;

  @Prop({ default: 'USDT' })
  Coin: string; // e.g. 'USDT', 'BTC'

  @Prop({ type: Date })
  date: Date;
}

export const UserTransactionSchema = SchemaFactory.createForClass(UserTransaction);
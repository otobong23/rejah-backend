

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, trim: true })
  password: string;

  @Prop({ type: [String, undefined], select: false })
  forgotPasswordCode: string | undefined;

  @Prop({ type: [Number, undefined], select: false })
  forgotPasswordCodeValidation: number | undefined;

  @Prop({ required: true })
  referral_code?: string;

  @Prop({ default: null })
  referredBy?: string;

  @Prop({ default: 0 })
  referral_count?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

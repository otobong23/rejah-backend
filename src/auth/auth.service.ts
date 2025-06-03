import { Injectable, UnauthorizedException, ConflictException, BadRequestException, InternalServerErrorException, NotFoundException, RequestTimeoutException  } from '@nestjs/common';
import { Login, Signup } from './dto/auth.types';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import doHash, { validateHash } from 'src/common/helpers/hashing';
import * as crypto from 'crypto';
import sendResetMail from 'src/common/helpers/mailer';

export function generateReferralCode(): string {
  return crypto.randomBytes(3).toString('hex'); // 6-char code like 'a4d2f1'
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) { }

  //login service functionalities 
  //start
  async validateUser({ email, password }: Login): Promise<any> {
    const user = await this.userModel.findOne({ email });
    if (user && await validateHash(password, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }
  async login(user) {
    const payload = { username: user.username, email: user.email };
    return {
      success: true,
      token: this.jwtService.sign(payload),
      message: 'login successful'
    };
  }
  //end

  //signup service functionalities
  //start
  async signup(signup: Signup) {
    const { email, username, password, referral_code } = signup
    const existingUser = await this.userModel.findOne({ username });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await doHash(password, 10);

    let referredBy: string | undefined;

    // Handle referral_code if provided
    if (referral_code) {
      const referrer = await this.userModel.findOne({ referral_code });
      if (!referrer) {
        throw new BadRequestException('Invalid referral code');
      }
      referredBy = referrer.referral_code;

      // Update referral count
      await this.userModel.findByIdAndUpdate(referral_code, {
        $inc: { referral_count: 1 },
      });

    }
    const newUser = await new this.userModel({
      email,
      username,
      password: hashedPassword,
      referral_code: generateReferralCode(),
      referredBy,
    });
    await newUser.save()

    // Generate JWT
    const payload = { username: newUser.username, email: newUser.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  //end

  //sendCode service functionalities
  //start
  async sendCode(email){
    const existingUser = await this.userModel.findOne({ email });
    if (!existingUser) {
      throw new NotFoundException("User doesn't exists");
    } 
    const code = Math.floor(Math.random() * 1000000).toString();
    const info = await sendResetMail(email, existingUser.username, code)
    if(!info) {
      throw new InternalServerErrorException(`Failed to send to Code to ${email}`)
    }
    existingUser.forgotPasswordCode = code
    existingUser.forgotPasswordCodeValidation = Date.now()
    existingUser.save()

    return {message: 'Code Sent Successfully!'}
  }
  //end

  //verifyCode service functionalities
  //start
  async verifyCode(email, code){
    const existingUser = await this.userModel.findOne({ email }).select('+forgotPasswordCode +forgotPasswordCodeValidation')
    if (!existingUser) {
      throw new NotFoundException("User doesn't exists");
    } 
    if (!existingUser.forgotPasswordCode || !existingUser.forgotPasswordCodeValidation){
      throw new InternalServerErrorException('Something Went Wrong')
    }
    if (Date.now() - new Date(existingUser.forgotPasswordCodeValidation).getTime() > 10 * 60 * 1000){
      throw new RequestTimeoutException('Code Has Been Expired!')
    }
    if(code !== existingUser.forgotPasswordCode){
      existingUser.forgotPasswordCode = undefined
      existingUser.forgotPasswordCodeValidation = undefined
      await existingUser.save()
      const token = this.jwtService.sign({ email }, { expiresIn: '10m' });
      return { token }
    }else {
      throw new ConflictException('Code is Invalid')
    }
  }
  //end

  //updatePassword service functionalities
  //start
  async updatePassword(email, newPassword){
    const existingUser = await this.userModel.findOne({ email })
    if (!existingUser) {
      throw new NotFoundException("User doesn't exists");
    }
    existingUser.password = newPassword
    await existingUser.save()
    return { success: true, message: 'Password Set Successfully' }
  }
  //end
}

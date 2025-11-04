import { Injectable, UnauthorizedException, ConflictException, BadRequestException, InternalServerErrorException, NotFoundException, RequestTimeoutException  } from '@nestjs/common';
import { Login, Signup } from './dto/auth.types';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/common/schemas/user/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import doHash, { validateHash } from 'src/common/helpers/hashing';
import * as crypto from 'crypto';
import sendResetMail from 'src/common/helpers/mailer';
import { CrewService } from 'src/crew/crew.service';

export function generateUserID(): string {
  return crypto.randomBytes(3).toString('hex'); // 6-char code like 'a4d2f1'
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private crewService: CrewService,
    private jwtService: JwtService,
  ) { }

  private async generateUniqueUserID(): Promise<string> {
  let userID: string;
  let exists = true;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  while (exists && attempts < MAX_ATTEMPTS) {
    userID = generateUserID();
    const user = await this.userModel.findOne({ userID });
    exists = !!user;
    attempts++;
  }

  if (exists) throw new RequestTimeoutException('Failed to generate unique userID after multiple attempts');

  return userID!;
}

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
    const getCrew = await this.crewService.getUserCrew(user.email);
    if(!getCrew) await this.crewService.createCrew(user)
    return {
      success: true,
      access_token: this.jwtService.sign(payload),
      message: 'login successful'
    };
  }
  //end

  //signup service functionalities
  //start
  // auth.service.ts
async signup(signup: Signup) {
  const { email, username, password, referral_code } = signup;
  const existingUser = await this.userModel.findOne({ username });
  if (existingUser) {
    throw new ConflictException('User already exists');
  }
  const checkEmail = await this.userModel.findOne({ email });
  if (checkEmail) throw new ConflictException('User already exists');
  
  const hashedPassword = await doHash(password, 10);

  let referredBy: string | undefined;
  if (referral_code) {
    const referrer = await this.userModel.findOne({ referral_code });
    if (!referrer) {
      throw new BadRequestException('Invalid referral code');
    }
    referredBy = referrer.referral_code;

    await this.userModel.findByIdAndUpdate(referrer._id, {
      $inc: { referral_count: 1 },
    });
  }

  // Generate unique userID
  const userID = await this.generateUniqueUserID();
  const newUser = new this.userModel({
    userID,
    email,
    username,
    password: hashedPassword,
    referral_code: userID, // user's referral code is their own userID
    referredBy,
  });
  await newUser.save();
  await this.crewService.createCrew(newUser);

  // Update the referrers' crew levels (up to 3 levels)
  if (referral_code) {
    await this.crewService.updateCrew(referral_code, newUser);
  }
  
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
    const code = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
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
    if(code === existingUser.forgotPasswordCode){
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
    const hashedPassword = await doHash(newPassword, 10);
    existingUser.password = hashedPassword
    await existingUser.save()
    return { success: true, message: 'Password Set Successfully' }
  }
  //end
}

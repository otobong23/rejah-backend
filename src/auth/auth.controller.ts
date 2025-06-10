import { Controller, Get, Post, Body, Patch, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Login, Signup } from './dto/auth.types';
import { JwtAuthGuard } from 'src/common/strategies/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  login(@Body() createAuthDto: Login) {
    const user = this.authService.validateUser(createAuthDto);
    return this.authService.login(user)
  }
  @Post('signup')
  signup(@Body() createAuthDto: Signup) {
    return this.authService.signup(createAuthDto);
  }

  // @UseGuards(JwtAuthGuard)
  // @Patch('signout')
  // signout(@Req() req){
  //   return req.clearCookie('Authorization')
  // }

  @Get('sendVerificationCode')
  sendVerification(@Body() { email }: { email: string }) {
    return this.authService.sendCode(email)
  }

  @Post('verify-code')
  verifyCode(@Body() { email, code }: { email: string, code: string }) {
    return this.authService.verifyCode(email, code)
  }


  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() { newPassword }:{ newPassword: string }, @Req() req) {
    const email = req.user.email;
    return this.authService.updatePassword(email, newPassword);
  }

}

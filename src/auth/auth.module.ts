import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller'
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { configDotenv } from 'dotenv';
import { UserModule } from 'src/common/schemas/user/user.module';
configDotenv()


@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy],
})
export class AuthModule { }

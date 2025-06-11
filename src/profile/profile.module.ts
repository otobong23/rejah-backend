import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { UserModule } from 'src/common/schemas/user/user.module';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';

@Module({
  imports: [ UserModule ],
  controllers: [ProfileController],
  providers: [ProfileService, JwtStrategy],
})
export class ProfileModule {}

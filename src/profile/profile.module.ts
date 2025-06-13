import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { UserModule } from 'src/common/schemas/user/user.module';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { UserCrewModule } from 'src/common/schemas/crew/userCrew.module';
import { CrewModule } from 'src/crew/crew.module';

@Module({
  imports: [ UserModule, UserCrewModule, CrewModule ],
  controllers: [ProfileController],
  providers: [ProfileService, JwtStrategy],
})
export class ProfileModule {}

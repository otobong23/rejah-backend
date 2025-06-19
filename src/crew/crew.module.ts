import { Module } from '@nestjs/common';
import { CrewService } from './crew.service';
import { CrewController } from './crew.controller';
import { UserCrewModule } from 'src/common/schemas/crew/userCrew.module';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { UserModule } from 'src/common/schemas/user/user.module';
import { UserTransactionModule } from 'src/common/schemas/transaction/userTransaction.module';

@Module({
  imports: [ UserCrewModule, UserModule, UserTransactionModule ],
  controllers: [CrewController],
  providers: [CrewService, JwtStrategy],
  exports: [CrewService]
})
export class CrewModule {}
 
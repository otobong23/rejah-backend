import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { UserModule } from 'src/common/schemas/user/user.module';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { UserTransactionModule } from 'src/common/schemas/transaction/userTransaction.module';
import { UserCrewModule } from 'src/common/schemas/crew/userCrew.module';
import { CrewModule } from 'src/crew/crew.module';

@Module({
  imports: [ UserModule, UserTransactionModule, UserCrewModule, CrewModule ],
  controllers: [TransactionController],
  providers: [TransactionService, JwtStrategy],
  exports: [TransactionService]
})
export class TransactionModule {}

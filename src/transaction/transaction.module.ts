import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { UserModule } from 'src/common/schemas/user/user.module';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';
import { UserTransactionModule } from 'src/common/schemas/transaction/userTransaction.module';

@Module({
  imports: [ UserModule, UserTransactionModule ],
  controllers: [TransactionController],
  providers: [TransactionService, JwtStrategy],
})
export class TransactionModule {}

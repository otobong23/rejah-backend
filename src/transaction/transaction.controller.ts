import { Controller, Post, Body, UseGuards, Req, BadRequestException, Get } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/strategies/jwt-auth.guard';
import { TransactionService } from './transaction.service';
import { DepositDto, UseBalanceDTO, WithdrawDto } from './dto/transaction.dto';

@UseGuards(JwtAuthGuard)
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) { }

  @Post('deposit')
  async deposit(@Body() depositDto:DepositDto, @Req() req) {
    const email = req.user.email;
    const { amount, image } = depositDto;

    if (image.length > 10 * 1024 * 1024) {
      throw new BadRequestException('File too large');
    }
    return await this.transactionService.deposit({
      amount,
      image,
    }, email);
  }

  @Post('withdraw')
  async WithdrawDto(@Body() withdrawDto:WithdrawDto, @Req() req){
    const email = req.user.email;
    return this.transactionService.withdraw(withdrawDto, email)
  }

  @Get()
  async getTransactions(@Req() req){
    const email = req.user.email
    return this.transactionService.getTransactionHistory(email)
  }

  @Post('useBalance')
  async useBalance(@Body() useBalanceDto: UseBalanceDTO, @Req() req) {
    const email = req.user.email
    return this.transactionService.useUserBalance(email, useBalanceDto.amount, useBalanceDto.action)
  }
}

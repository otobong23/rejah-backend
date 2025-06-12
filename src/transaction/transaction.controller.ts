import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/strategies/jwt-auth.guard';
import { TransactionService } from './transaction.service';
import { DepositDto } from './dto/transaction.dto';

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
}

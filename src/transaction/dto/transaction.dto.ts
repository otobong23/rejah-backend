import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class DepositDto {

   @IsNotEmpty()@IsNumber()
   amount: number;

   @IsNotEmpty()@IsString()
   image: string; // includes data:image/png;base64,...
}

export class WithdrawDto {
   
   @IsNotEmpty()@IsNumber()
   amount: number;

   @IsNotEmpty()@IsString()
   walletAddress: string;

}

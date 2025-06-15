import { IsNotEmpty, IsString } from "class-validator";

export class CreateAdminDto {}

export class AdminLoginDto {
   @IsString()@IsNotEmpty()
   email: string;
   
   @IsString()@IsNotEmpty()
   password: string
}
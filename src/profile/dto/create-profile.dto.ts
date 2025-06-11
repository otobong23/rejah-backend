import { IsNotEmpty, IsString } from "class-validator";

export class CreateProfileDto {
   @IsString()@IsNotEmpty()
   username: string;

   @IsString()@IsNotEmpty()
   email: string;
   
}

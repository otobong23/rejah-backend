import { PartialType } from '@nestjs/mapped-types';
import { UserProfileDTO } from './create-profile.dto';

export class UpdateProfileDto extends PartialType(UserProfileDTO) {}

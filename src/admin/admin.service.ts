import { Injectable } from '@nestjs/common';
import { AdminLoginDto } from './dto/create-admin.dto';

@Injectable()
export class AdminService {
  login(adminLogindto: AdminLoginDto) {
    return 'This action adds a new admin';
  }
}

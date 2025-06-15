import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/create-admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  login(@Body() adminLogindto: AdminLoginDto) {
    return this.adminService.login(adminLogindto);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, Put, ParseIntPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto, AdminUpdateDto, UpdateTransactionDto } from './dto/create-admin.dto';
import { JwtAuthGuard } from 'src/common/strategies/jwt-auth.guard';
import { UpdateProfileDto } from 'src/profile/dto/update-profile.dto';


@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // ─────────────── ADMIN ───────────────
  @Post('auth/login')
  login(@Body() adminLogindto: AdminLoginDto) {
    return this.adminService.login(adminLogindto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('updateAdmin')
  updateAdmin(@Req() req, @Body() adminDto: AdminUpdateDto) {
    const email = req.user.email
    return this.adminService.updateAdmin(email, adminDto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('getAdmin')
  getAdmin(@Req() req) {
    return this.adminService.getAdmin(req.user.email)
  }

  // ─────────────── USERS ───────────────
  @UseGuards(JwtAuthGuard)
  @Get('totalUsers')
  async getTotalUsers() {
    return await this.adminService.getTotalUsers()
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async getAllUsers(
    @Query('limit', ParseIntPipe) limit = 50,
    @Query('page', ParseIntPipe) page = 1
  ) {
    return await this.adminService.getAllUsers(limit, page);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:email')
  async getUser(@Param('email') email: string) {
    return await this.adminService.getUser(email);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/:email')
  updateProfile(@Param('email') email: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.adminService.updateUser(email, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getUserByuserID(@Query('userID') userID: string) {
    return await this.adminService.getUserByuserID(userID)
  }

  @UseGuards(JwtAuthGuard)
  @Get('search/users')
  async searchUsers(@Query('keyword') keyword: string) {
    return this.adminService.searchUsers(keyword);
  }

  // ─────────────── CREWS ───────────────
  @UseGuards(JwtAuthGuard)
  @Get('totalCrews')
  async getTotalCrew() {
    return await this.adminService.getTotalCrews()
  }

  @UseGuards(JwtAuthGuard)
  @Get('crews')
  async getAllCrews(
    @Query('limit', ParseIntPipe) limit = 50,
    @Query('page', ParseIntPipe) page = 1
  ) {
    return await this.adminService.getAllCrews(limit, page);
  }

  @UseGuards(JwtAuthGuard)
  @Get('crew')
  async getUserCrew(@Query('userID') userID: string) {
    return await this.adminService.getUserCrew(userID);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search/crews')
  async searchCrews(@Query('keyword') keyword: string) {
    return this.adminService.searchCrews(keyword);
  }

  // ─────────────── TRANSACTIONS ───────────────
  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(
    @Query('limit', ParseIntPipe) limit = 50,
    @Query('page', ParseIntPipe) page = 1
  ) {
    return await this.adminService.getTransactions(limit, page);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions/users')
  async getUsersTransactions(
    @Query('email') email: string,
    @Query('limit', ParseIntPipe) limit = 50,
    @Query('page', ParseIntPipe) page = 1
  ) {
    return await this.adminService.getUserTransactions(email, limit, page);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('transactions/update')
  async updateTransaction(
    @Query('email') email: string,
    @Query('transactionID') transactionID: string,
    @Body() updateData: UpdateTransactionDto
  ) {
    return await this.adminService.updateTransaction(email, transactionID, updateData);
  }

  // ─────────────── ACTIONS ───────────────
  @UseGuards(JwtAuthGuard)
  @Patch('detachUser')
  async detachUser(@Body() {userID}:{ userID: string }) {
    return await this.adminService.deleteUserCascade(userID)
  }

  @Get('globalData')
  async globalData(){
    return await this.adminService.globalData()
  }
}

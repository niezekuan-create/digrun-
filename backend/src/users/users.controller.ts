import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Admin endpoints (must be before :id route) ────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/list')
  findAllForAdmin() {
    return this.usersService.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/:id/role')
  setRole(@Param('id') id: string, @Body('is_admin') isAdmin: boolean) {
    return this.usersService.setAdminRole(+id, isAdmin);
  }

  // ─── User endpoints ────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }
}

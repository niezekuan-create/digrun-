import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  // ─── User endpoints ────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createRegistrationDto: CreateRegistrationDto) {
    return this.registrationsService.create(req.user.id, createRegistrationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMy(@Request() req) {
    return this.registrationsService.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancel(@Request() req, @Param('id') id: string) {
    return this.registrationsService.cancel(req.user.id, +id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkin')
  checkin(@Body('data') data: string) {
    return this.registrationsService.checkin(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/qrcode')
  getQrCode(@Param('id') id: string) {
    return this.registrationsService.getQrCode(+id);
  }

  // ─── Admin endpoints ───────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/list')
  findAllForAdmin(@Query('event_id') eventId?: string) {
    return this.registrationsService.findAllForAdmin(eventId ? +eventId : undefined);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/:id/approve')
  approve(@Request() req, @Param('id') id: string) {
    return this.registrationsService.approve(req.user.id, +id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/:id/reject')
  reject(@Request() req, @Param('id') id: string) {
    return this.registrationsService.reject(req.user.id, +id);
  }

  // ─── General endpoints ─────────────────────────────────────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  findAll(@Query('event_id') eventId?: string) {
    if (eventId) return this.registrationsService.findByEvent(+eventId);
    return this.registrationsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.registrationsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRegistrationDto: UpdateRegistrationDto) {
    return this.registrationsService.update(+id, updateRegistrationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.registrationsService.remove(+id);
  }
}

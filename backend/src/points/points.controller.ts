import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

const imageFileFilter = (req: any, file: Express.Multer.File, cb: Function) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new BadRequestException('仅允许上传 jpg / png / webp / gif 图片'), false);
  }
  cb(null, true);
};
import { PointsService } from './points.service';
import { CreateProductDto, UpdateProductDto, UpdateOrderStatusDto } from './dto/points.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  // ─── User endpoints ────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyAccount(@Request() req) {
    return this.pointsService.getMyAccount(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  getMyTransactions(@Request() req) {
    return this.pointsService.getTransactions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  getMyOrders(@Request() req) {
    return this.pointsService.getMyOrders(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('exchange/:productId')
  exchange(@Request() req, @Param('productId') productId: string, @Body() body: { size?: string; delivery_type?: string; address?: { name?: string; phone?: string; detail?: string } }) {
    return this.pointsService.exchange(req.user.id, +productId, body?.size, body?.delivery_type, body?.address);
  }

  // ─── Products (public list) ────────────────────────────────

  @Get('products')
  getProducts() {
    return this.pointsService.getProducts(true);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.pointsService.findProduct(+id);
  }

  // ─── Admin endpoints ───────────────────────────────────────

  @Post('admin/upload-image')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/products',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    return { image_url: `/uploads/products/${file.filename}` };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/products')
  getAllProducts() {
    return this.pointsService.getProducts(false);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.pointsService.createProduct(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.pointsService.updateProduct(+id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('admin/products/:id')
  removeProduct(@Param('id') id: string) {
    return this.pointsService.removeProduct(+id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/transactions')
  getAllTransactions() {
    return this.pointsService.getAllTransactions();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/orders')
  getAllOrders() {
    return this.pointsService.getAllOrders();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/orders/:id')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.pointsService.updateOrderStatus(+id, dto.status);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/users')
  getUsersWithPoints() {
    return this.pointsService.getUsersWithPoints();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/users/:userId/transactions')
  getUserTransactions(@Param('userId') userId: string) {
    return this.pointsService.getUserTransactions(+userId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/adjust')
  adminAdjust(@Request() req, @Body() body: { user_id: number; amount: number; reason: string }) {
    return this.pointsService.adminAdjust(req.user.id, body.user_id, body.amount, body.reason);
  }
}

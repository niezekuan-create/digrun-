import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPoints } from './entities/user-points.entity';
import { PointsTransaction } from './entities/points-transaction.entity';
import { PointsProduct } from './entities/points-product.entity';
import { PointsOrder } from './entities/points-order.entity';
import { CreateProductDto, UpdateProductDto } from './dto/points.dto';

const CHECKIN_POINTS = parseInt(process.env.CHECKIN_POINTS || '10');

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(UserPoints)
    private userPointsRepo: Repository<UserPoints>,
    @InjectRepository(PointsTransaction)
    private transactionRepo: Repository<PointsTransaction>,
    @InjectRepository(PointsProduct)
    private productRepo: Repository<PointsProduct>,
    @InjectRepository(PointsOrder)
    private orderRepo: Repository<PointsOrder>,
  ) {}

  // ─── Account ───────────────────────────────────────────────

  async getOrCreate(userId: number): Promise<UserPoints> {
    let account = await this.userPointsRepo.findOneBy({ user_id: userId });
    if (!account) {
      account = this.userPointsRepo.create({ user_id: userId, points_balance: 0, points_total: 0 });
      account = await this.userPointsRepo.save(account);
    }
    return account;
  }

  async getMyAccount(userId: number) {
    return this.getOrCreate(userId);
  }

  // ─── Transactions ──────────────────────────────────────────

  async getTransactions(userId: number) {
    return this.transactionRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async getAllTransactions() {
    return this.transactionRepo.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async awardPoints(userId: number, amount: number, source: string, relatedId?: number, description?: string) {
    const account = await this.getOrCreate(userId);
    await this.userPointsRepo.update(account.id, {
      points_balance: account.points_balance + amount,
      points_total: account.points_total + amount,
    });
    return this.transactionRepo.save(
      this.transactionRepo.create({ user_id: userId, points_change: amount, source, related_id: relatedId, description }),
    );
  }

  async awardCheckinPoints(userId: number, eventId: number, eventTitle: string) {
    return this.awardPoints(userId, CHECKIN_POINTS, 'event_checkin', eventId, `活动签到 · ${eventTitle}`);
  }

  async adminAdjust(operatorId: number, userId: number, amount: number, reason: string) {
    const account = await this.getOrCreate(userId);
    const newBalance = account.points_balance + amount;
    if (newBalance < 0) throw new BadRequestException('积分余额不足，无法扣减');
    await this.userPointsRepo.update(account.id, {
      points_balance: newBalance,
      points_total: amount > 0 ? account.points_total + amount : account.points_total,
    });
    const description = amount > 0 ? `管理员调整 · ${reason}` : `管理员扣减 · ${reason}`;
    return this.transactionRepo.save(
      this.transactionRepo.create({
        user_id: userId, points_change: amount,
        source: 'admin_adjust', description, reason, operator_id: operatorId,
      }),
    );
  }

  async getUsersWithPoints() {
    return this.userPointsRepo.find({ relations: ['user'], order: { updated_at: 'DESC' } });
  }

  async getUserTransactions(userId: number) {
    return this.transactionRepo.find({
      where: { user_id: userId }, order: { created_at: 'DESC' }, take: 20,
    });
  }

  // ─── Products ──────────────────────────────────────────────

  getProducts(activeOnly = true) {
    if (activeOnly) return this.productRepo.findBy({ status: 'active' });
    return this.productRepo.find({ order: { created_at: 'DESC' } });
  }

  findProduct(id: number) {
    return this.productRepo.findOneBy({ id });
  }

  createProduct(dto: CreateProductDto) {
    const product = this.productRepo.create({ ...dto, status: dto.status || 'active' });
    return this.productRepo.save(product);
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    await this.productRepo.update(id, dto);
    return this.productRepo.findOneBy({ id });
  }

  removeProduct(id: number) {
    return this.productRepo.delete(id);
  }

  // ─── Orders ────────────────────────────────────────────────

  async exchange(userId: number, productId: number, size?: string, deliveryType?: string, address?: { name?: string; phone?: string; detail?: string }) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.status !== 'active') throw new BadRequestException('商品已下架');
    if (product.stock <= 0) throw new BadRequestException('库存不足');

    const account = await this.getOrCreate(userId);
    if (account.points_balance < product.points_cost) {
      throw new BadRequestException(`积分不足，需要 ${product.points_cost} 积分，当前余额 ${account.points_balance}`);
    }

    // Deduct points
    await this.userPointsRepo.update(account.id, {
      points_balance: account.points_balance - product.points_cost,
    });
    // Decrease stock
    await this.productRepo.update(productId, { stock: product.stock - 1 });

    // Create transaction
    await this.transactionRepo.save(
      this.transactionRepo.create({
        user_id: userId,
        points_change: -product.points_cost,
        source: 'mall_exchange',
        description: `积分商城兑换 · ${product.name}`,
      }),
    );

    // Create order
    const order = this.orderRepo.create({
      user_id: userId, product_id: productId, points_spent: product.points_cost, size,
      delivery_type: deliveryType || 'shipping',
      address_name: address?.name, address_phone: address?.phone, address_detail: address?.detail,
    });
    return this.orderRepo.save(order);
  }

  getMyOrders(userId: number) {
    return this.orderRepo.find({
      where: { user_id: userId },
      relations: ['product'],
      order: { created_at: 'DESC' },
    });
  }

  getAllOrders() {
    return this.orderRepo.find({
      relations: ['user', 'product'],
      order: { created_at: 'DESC' },
    });
  }

  async updateOrderStatus(id: number, status: string) {
    await this.orderRepo.update(id, { status });
    return this.orderRepo.findOne({ where: { id }, relations: ['user', 'product'] });
  }
}

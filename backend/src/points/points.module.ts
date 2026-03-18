import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { UserPoints } from './entities/user-points.entity';
import { PointsTransaction } from './entities/points-transaction.entity';
import { PointsProduct } from './entities/points-product.entity';
import { PointsOrder } from './entities/points-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserPoints, PointsTransaction, PointsProduct, PointsOrder])],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}

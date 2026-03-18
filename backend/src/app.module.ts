import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { AuthModule } from './auth/auth.module';
import { PodcastsModule } from './podcasts/podcasts.module';
import { PointsModule } from './points/points.module';
import { User } from './users/entities/user.entity';
import { Event } from './events/entities/event.entity';
import { Registration } from './registrations/entities/registration.entity';
import { Podcast } from './podcasts/entities/podcast.entity';
import { UserPoints } from './points/entities/user-points.entity';
import { PointsTransaction } from './points/entities/points-transaction.entity';
import { PointsProduct } from './points/entities/points-product.entity';
import { PointsOrder } from './points/entities/points-order.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'niezekuan',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'digrun',
      entities: [User, Event, Registration, Podcast, UserPoints, PointsTransaction, PointsProduct, PointsOrder],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    EventsModule,
    RegistrationsModule,
    PodcastsModule,
    PointsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

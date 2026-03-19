import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Event } from './entities/event.entity';
import { Registration } from '../registrations/entities/registration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Registration])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}

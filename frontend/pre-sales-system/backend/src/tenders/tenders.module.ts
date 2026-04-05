import { Module } from '@nestjs/common';
import { TendersController } from './tenders.controller';
import { TendersService } from './tenders.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TendersController],
  providers: [TendersService],
  exports: [TendersService],
})
export class TendersModule {}

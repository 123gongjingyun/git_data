import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TimeLogsController } from './timelogs.controller';
import { TimeLogsService } from './timelogs.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [
    TeamsController,
    TasksController,
    TimeLogsController,
  ],
  providers: [
    TeamsService,
    TasksService,
    TimeLogsService,
    PrismaService,
  ],
  exports: [TeamsService, TasksService, TimeLogsService],
})
export class TeamsModule {}

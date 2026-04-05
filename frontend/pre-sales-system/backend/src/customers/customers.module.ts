import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { FollowupsService } from './followups.service';
import { FollowupsController } from './followups.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [
    CustomersController,
    ContactsController,
    FollowupsController,
  ],
  providers: [
    CustomersService,
    ContactsService,
    FollowupsService,
    PrismaService,
  ],
  exports: [CustomersService, ContactsService, FollowupsService],
})
export class CustomersModule {}

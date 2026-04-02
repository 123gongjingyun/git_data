import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { DocumentsModule } from './documents/documents.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TendersModule } from './tenders/tenders.module';
import { ContractsModule } from './contracts/contracts.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    ProjectsModule,
    DocumentsModule,
    AnalyticsModule,
    TendersModule,
    ContractsModule,
    TeamsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}

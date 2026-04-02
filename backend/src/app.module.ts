import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { DomainModule } from "./domain/domain.module";
import { OpportunitiesModule } from "./opportunities/opportunities.module";
import { SolutionVersionsModule } from "./solution-versions/solution-versions.module";
import { MockOpportunitiesModule } from "./opportunities/mock-opportunities.module";
import { SettingsModule } from "./settings/settings.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { WorkflowsModule } from "./workflows/workflows.module";
import { UsersModule } from "./users/users.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { runtimeConfig } from "./config/runtime";

// DB_TYPE 支持:
// - "mysql"  (默认) 使用 MySQL / MariaDB，通过 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME 配置
// - "sqlite" 使用本地 SQLite 文件，通过 DB_SQLITE_PATH 指定文件路径（可选）
const dbType = runtimeConfig.dbType;

const shouldInitDb = true;

const dbModuleImports =
  shouldInitDb && dbType === "sqlite"
    ? [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: runtimeConfig.dbSqlitePath,
          autoLoadEntities: true,
          synchronize: runtimeConfig.dbSynchronize,
        }),
      ]
    : shouldInitDb
      ? [
          TypeOrmModule.forRoot({
            type: "mysql",
            host: runtimeConfig.dbHost,
            port: runtimeConfig.dbPort,
            username: runtimeConfig.dbUser,
            password: runtimeConfig.dbPassword,
            database: runtimeConfig.dbName,
            autoLoadEntities: true,
            synchronize: runtimeConfig.dbSynchronize,
          }),
        ]
      : [];

const dbRelatedFeatureModules =
  shouldInitDb && dbModuleImports.length > 0
    ? [
        DomainModule,
        OpportunitiesModule,
        SolutionVersionsModule,
        KnowledgeModule,
        WorkflowsModule,
        UsersModule,
        ApprovalsModule,
      ]
    : [];

const mockFeatureModules =
  shouldInitDb && dbModuleImports.length > 0 ? [] : [MockOpportunitiesModule];

@Module({
  imports: [
    ...dbModuleImports,
    HealthModule,
    AuthModule,
    SettingsModule,
    ...dbRelatedFeatureModules,
    ...mockFeatureModules,
  ],
})
export class AppModule {}

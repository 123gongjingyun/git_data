import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 启用CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://your-production-domain.com']
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // 全局路由前缀
  app.setGlobalPrefix('api');

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('售前流程全生命周期管理系统 API')
    .setDescription('提供售前项目、商机、解决方案、投标、合同等全流程管理API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', '认证相关')
    .addTag('users', '用户管理')
    .addTag('projects', '项目管理')
    .addTag('opportunities', '商机管理')
    .addTag('solutions', '解决方案')
    .addTag('tenders', '投标管理')
    .addTag('contracts', '合同管理')
    .addTag('documents', '文档管理')
    .addTag('activities', '活动记录')
    .addTag('comments', '评论')
    .addTag('analytics', '数据分析')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();

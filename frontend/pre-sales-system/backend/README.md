# 售前流程全生命周期管理系统 - 后端

基于 NestJS + Prisma + PostgreSQL 构建的后端服务。

## 技术栈

- **框架**: NestJS 10.x
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **认证**: JWT + Passport.js
- **API文档**: Swagger

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库

确保 PostgreSQL 已安装并运行。编辑 `.env` 文件配置数据库连接:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pre_sales"
```

### 3. 数据库迁移

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# (可选) 打开 Prisma Studio 查看数据
npm run prisma:studio
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务将在 http://localhost:3001 启动。

### 5. 访问 API 文档

打开浏览器访问: http://localhost:3001/api/docs

## 可用脚本

- `npm run build` - 构建项目
- `npm run format` - 格式化代码
- `npm run start` - 启动生产服务器
- `npm run dev` - 启动开发服务器(热重载)
- `npm run lint` - 运行 ESLint 检查
- `npm run test` - 运行单元测试
- `npm run test:e2e` - 运行端到端测试
- `npm run test:cov` - 运行测试并生成覆盖率报告

## API 端点

### 认证相关 (`/api/auth`)

- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `GET /auth/profile` - 获取当前用户信息 (需要认证)

### 项目管理 (`/api/projects`)

- `POST /projects` - 创建项目 (需要权限)
- `GET /projects` - 获取项目列表 (支持分页和筛选)
- `GET /projects/:id` - 获取项目详情
- `PUT /projects/:id` - 更新项目 (需要权限)
- `DELETE /projects/:id` - 删除项目 (需要权限)
- `GET /projects/:id/activities` - 获取项目活动记录
- `POST /projects/:id/activities` - 添加项目活动记录

更多端点请参考 Swagger 文档。

## 认证

所有受保护的端点都需要在请求头中包含 JWT token:

```
Authorization: Bearer <your-jwt-token>
```

## 环境变量

复制 `.env` 文件并配置以下变量:

```env
# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/pre_sales"

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO配置
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# 应用配置
PORT=3001
NODE_ENV=development
```

## 项目结构

```
src/
├── auth/              # 认证模块
│   ├── dto/          # 数据传输对象
│   ├── guards/       # 守卫
│   ├── strategies/   # 策略
├── common/           # 公共模块
│   ├── decorators/   # 装饰器
│   ├── guards/       # 守卫
├── projects/         # 项目管理模块
│   └── dto/          # 数据传输对象
├── prisma/           # Prisma 配置
├── app.module.ts     # 应用主模块
└── main.ts           # 应用入口
```

## 开发说明

### 添加新模块

1. 创建模块目录: `src/[module-name]/`
2. 创建文件: `*.module.ts`, `*.controller.ts`, `*.service.ts`
3. 在 `app.module.ts` 中注册模块

### 数据库变更

1. 修改 `prisma/schema.prisma`
2. 运行迁移: `npm run prisma:migrate`
3. 重新生成客户端: `npm run prisma:generate`

## 测试

```bash
# 运行所有测试
npm run test

# 运行测试并监听模式
npm run test:watch

# 生成测试覆盖率
npm run test:cov
```

## 部署

```bash
# 构建项目
npm run build

# 启动生产服务器
npm run start:prod
```

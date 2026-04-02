# 售前流程全生命周期管理系统

一个面向售前解决方案工程师的专业工作平台，实现售前项目从线索到签约的全流程数字化、标准化管理。

## 📋 项目概述

**项目名称**: 售前流程全生命周期管理系统  
**定位**: CRM系统增强模块，专为售前团队设计  
**目标**: 提升售前效率，规范化业务流程，提高成单率

## 🎯 核心价值

- **流程标准化**: 统一售前流程，减少人为疏漏
- **数据可视化**: 实时掌握项目进展和业绩情况
- **知识沉淀**: 积累解决方案经验，提升团队能力
- **效率提升**: 自动化重复工作，专注核心业务

## 🏗️ 技术架构

### 前端技术栈
- **框架**: React 18 + TypeScript
- **UI组件**: Ant Design 5.x
- **路由**: React Router v6
- **状态管理**: Redux Toolkit (计划)
- **图表**: @ant-design/charts
- **构建工具**: Vite

### 后端技术栈
- **框架**: Node.js + NestJS 10.x
- **数据库**: PostgreSQL + Redis
- **ORM**: Prisma
- **认证**: JWT + Passport.js
- **文件存储**: MinIO / AWS S3
- **搜索**: Elasticsearch

## 📦 核心功能模块

### 1. 项目管理
- 线索录入与评估
- 项目状态跟踪
- 优先级管理
- 里程碑设置

### 2. 商机管理
- 商机转化漏斗
- 成功概率评估
- 加权价值计算
- 竞争对手分析

### 3. 解决方案管理
- 方案版本控制
- 审批流程管理
- 文档协同编辑
- 模板库管理

### 4. 投标管理
- 标书制作协调
- 投标进度跟踪
- 团队任务分配
- 结果记录分析

### 5. 合同管理
- 合同起草模板
- 多级审批流程
- 签约状态跟踪
- 付款条件管理

### 6. 知识库
- 成功案例库
- 解决方案模板
- 行业知识库
- 文档分类管理

### 7. 数据分析
- 销售漏斗分析
- 成功率统计
- 业绩趋势报告
- 团队效能分析

## 🗄️ 数据库设计

核心实体包括：
- users (用户)
- projects (项目)
- opportunities (商机)
- solutions (解决方案)
- documents (文档)
- tenders (投标)
- contracts (合同)
- activities (活动记录)
- comments (评论)

完整的数据库模型定义请参考 `backend/prisma/schema.prisma`

## 📁 项目结构

```
pre-sales-system/
├── PROJECT_PLAN.md              # 项目规划
├── README.md                    # 项目说明
├── demo.html                    # 演示页面
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── components/          # 公共组件
│   │   │   └── Layout.tsx      # 主布局
│   │   ├── pages/              # 页面组件
│   │   │   ├── auth/           # 认证相关
│   │   │   ├── dashboard/      # 工作台
│   │   │   ├── project/        # 项目管理
│   │   │   ├── opportunity/    # 商机管理
│   │   │   ├── solution/       # 解决方案
│   │   │   ├── tender/         # 投标管理
│   │   │   ├── contract/       # 合同管理
│   │   │   ├── knowledge/      # 知识库
│   │   │   ├── analytics/      # 数据分析
│   │   │   └── settings/       # 系统设置
│   │   ├── App.tsx            # 应用入口
│   │   └── main.tsx           # 主入口
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── backend/                    # 后端项目
    ├── prisma/
    │   └── schema.prisma      # 数据库模型
    └── (待完善)
```

## 🚀 快速开始

### 前置要求
- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x

### 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd backend
npm install
```

### 配置环境变量

创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/pre_sales"

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 文件存储配置
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### 数据库初始化

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 启动服务

```bash
# 启动前端
cd frontend
npm run dev

# 启动后端
cd backend
npm run dev
```

### 查看演示

直接在浏览器中打开 `demo.html` 查看演示效果。

## 📊 业务流程

```
线索管理 → 商机管理 → 解决方案 → 投标管理 → 合同管理
   ↓          ↓          ↓          ↓          ↓
 评估      需求分析    方案制定    标书制作    合同谈判
 转化      成功概率    版本控制    进度跟踪    签约管理
```

## 🎨 界面预览

### 工作台
- 关键指标统计
- 项目概览
- 待办任务
- 业绩趋势

### 项目管理
- 项目列表与搜索
- 项目详情查看
- 状态跟踪
- 里程碑管理

### 商机管理
- 商机漏斗分析
- 成功概率评估
- 加权价值计算
- 竞争对手对比

### 解决方案
- 方案版本管理
- 审批流程
- 文档协同
- 模板库

## 🔐 权限管理

用户角色：
- **管理员**: 全部权限
- **经理**: 查看和管理权限
- **销售经理**: 商机和项目管理
- **解决方案架构师**: 方案设计和审核
- **销售工程师**: 项目执行和跟进
- **普通员工**: 基础查看权限

## 📈 数据分析

提供多维度数据分析：
- 销售漏斗转化率
- 项目成功率统计
- 业绩趋势分析
- 团队效能评估
- 客户价值分析

## 🔄 开发计划

### Phase 1: 基础框架 ✅
- [x] 项目脚手架搭建
- [x] 数据库模型设计
- [x] 基础UI框架
- [x] 演示页面

### Phase 2: 核心功能 (进行中)
- [ ] 用户认证系统
- [ ] 项目管理模块
- [ ] 商机管理模块

### Phase 3: 高级功能
- [ ] 解决方案管理
- [ ] 投标管理
- [ ] 文档管理

### Phase 4: 完善功能
- [ ] 合同管理
- [ ] 工作流引擎
- [ ] 知识库系统

### Phase 5: 优化上线
- [ ] 性能优化
- [ ] 安全加固
- [ ] 部署上线

## 🔄 当前实现进度（前端 / 2026-03-19）

为便于后续迭代，这里记录当前已经完成的一比一复刻与联调状态：

- 布局与导航
  - [x] 顶部 Header 与左侧 Sider 使用 Ant Design `Layout` 实现，整体风格与 `demo.html` 保持一致（浅色顶栏 + 深色侧边栏）
  - [x] 左侧主菜单包含：工作台 / 项目管理 / 商机管理 / 解决方案 / 投标管理 / 合同管理 / 知识库 / 数据分析 / 系统设置
  - [x] 顶栏仅保留「折叠按钮 + 当前页名称」，内容区域不再重复展示页面主标题

- 工作台（工作台菜单）
  - [x] 使用 `WorkbenchView` 组件，一比一复刻 `demo.html` 中的工作台区域
  - [x] 包含关键指标卡片、最近项目列表、待办任务、本月业绩趋势等卡片布局
  - [x] 当前数据为前端 Mock，后续可逐步接入后端统计接口

- 项目管理（项目管理菜单）
  - [x] 使用 `ProjectsView` 组件，一比一复刻 `demo.html` 中的项目管理视图
  - [x] 顶部支持搜索 + 状态筛选 + 「新建项目」按钮（示例行为）
  - [x] 项目列表表格包含：项目名称、客户、状态、阶段、优先级等列，样式与 `demo.html` 对齐

- 商机管理（商机管理菜单）
  - [x] 当前菜单默认绑定到 `OpportunitiesDemoView` 组件（方案 A），为 `demo.html` 中商机管理页面的一比一复刻版本
  - [x] 页内包含：
    - 顶部：搜索商机、阶段筛选、`+ 新建商机` 按钮（示例行为）
    - 中部：四个统计卡片（商机总数 / 总预期价值 / 总加权价值 / 平均成功概率）
    - 底部：商机列表表格（商机名称 / 客户 / 阶段 / 预期价值 / 成功概率 / 加权价值 / 预计关闭时间 / 操作）
  - [x] 已接入后端基础查询接口：
    - 通过 `GET http://localhost:3000/opportunities` 加载商机数据，支持列表直接返回数组或 `{ items, total, page, pageSize }` 结构
    - 通过前端计算实现金额、加权金额与成功率等统计卡片
  - [x] 高级商机详情视图 `OpportunitiesView` 组件已保留，用于后续与方案版本、评审记录时间线等高级功能联动（当前未挂到菜单）
  - [x] 如需在实际联调中启用高级商机视图，可在前端环境中设置 `VITE_USE_ADVANCED_OPPORTUNITIES_VIEW=true`，此时“商机管理”菜单将挂载到 `OpportunitiesView`，并复用 `VITE_USE_MOCK_OPPORTUNITIES` 控制是否走真实后端 API。

- 解决方案（解决方案菜单）
  - [x] 使用 `SolutionsView` 组件，一比一复刻 `demo.html` 中的解决方案管理视图
  - [x] 包含方案搜索、状态筛选、`+ 新建方案` 按钮、方案统计卡片与方案列表表格
  - [x] 当前数据为 Mock，后续计划与后端 `solution-versions` 模块联调

- 投标管理 / 合同管理 / 知识库 / 数据分析 / 系统设置
  - [x] 对应视图分别使用 `BidsView` / `ContractsView` / `KnowledgeView` / `AnalyticsView` / `SettingsView` 组件
  - [x] 每个页面均根据 `demo.html` 完成一比一复刻（含列表、卡片、筛选器等），整体风格与工作台和项目管理保持一致
  - [x] 合同管理页之前出现的 `Paragraph is not defined` 异常已处理，当前打开不会再出现白屏
  - [x] 以上模块目前均使用前端 Mock 数据，后续会按模块逐步接入 NestJS 后端

### 与后端联调现状

- [x] 登录与鉴权
  - 前端 `LoginView` 已接入后端 `/auth/login`，成功登录后将 JWT `accessToken` 保存在 `localStorage` 中
  - App 级 Layout 会在检测到 `accessToken` 后展示主界面与菜单，否则展示登录页

- [x] 商机列表接口
  - `OpportunitiesDemoView` 使用登录后的 `accessToken` 调用 `GET /opportunities` 加载商机列表
  - 后端连接数据库异常时，页面会在商机列表卡片上方提示友好的错误文案，不会导致整体白屏

- [ ] 商机详情 + 方案版本 / 评审记录
  - 计划使用 `OpportunitiesView` + `useSolutionVersions` + `useReviewRecords`，通过以下接口实现：
    - `GET /opportunities/:id/solutions`
    - `POST /opportunities/:id/solutions`
    - （预留）`GET/POST /solutions/:id/reviews`

- [ ] 其他模块（项目、解决方案、投标、合同、知识库、数据分析、系统设置）的后端联调将按模块逐步推进

> 说明：本节会在每次完成新的前端复刻或后端联调任务后持续更新，作为开发过程的进度记录与对齐依据。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 👥 联系方式

如有问题，请联系项目团队。

---

**注意**: 当前为项目初期阶段，部分功能正在开发中。演示页面展示了系统的核心交互和UI设计。

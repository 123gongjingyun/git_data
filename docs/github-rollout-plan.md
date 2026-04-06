# GitHub 落地方案 README

## 1. 目标

- 在**不影响当前售前管理平台主业务开发、联调、部署**的前提下，为平台建立标准 GitHub 代码托管与自动打包能力。
- 第一阶段只做“代码收敛 + GitHub 托管 + 自动构建制品”。
- 第二阶段再做“受控发布到云服务器”。

## 2. 当前现状判断

当前 `/Users/gjy` 不是 Git 仓库，且它本身是用户家目录，不适合作为项目仓库根目录。原因：

- 同层存在大量个人目录与非项目资产；
- 直接在家目录初始化 Git，极易误纳入无关文件；
- 当前平台虽然包含：
  - `README.md`
  - `docs/`
  - `frontend/`
  - `backend/`
  - `docker-compose.yml`
- 但仍不应直接把整个 `/Users/gjy` 作为 GitHub 仓库根。

## 3. 推荐仓库边界

建议新建单独项目根目录，例如：

`/Users/gjy/Projects-mygetpre/presales-platform`

然后将以下内容收敛进去：

- `README.md`
- `docs/`
- `frontend/`
- `backend/`
- `docker-compose.yml`
- `.env.example`
- `.gitignore`
- GitHub Actions 工作流目录 `.github/workflows/`

不应纳入仓库的内容：

- 家目录下其他个人资料目录
- `node_modules/`
- `dist/`
- 本地缓存
- 本地数据库或导出文件
- 临时压缩包
- 本机截图、下载物料、非平台文档

## 4. 推荐目录结构

```text
presales-platform/
├── README.md
├── docs/
├── frontend/
├── backend/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── .github/
    └── workflows/
```

## 5. GitHub 落地分阶段方案

### 阶段 A：代码收敛

目标：将当前平台代码从家目录中整理为独立项目目录。

步骤：

1. 新建独立目录 `presales-platform/`
2. 将平台相关文件迁入该目录
3. 补齐 `.gitignore`
4. 清理所有本地产物与无关目录
5. 本地验证：
   - 前端可构建
   - 后端可构建
   - `docker-compose.yml` 路径仍正确

### 阶段 B：初始化 Git 仓库

目标：建立明确版本管理边界。

步骤：

1. `git init`
2. 配置默认分支 `main`
3. 首次提交基础代码
4. 添加 GitHub 远程仓库
5. 推送首个基础分支

执行补充：

- 本机若通过代理访问 GitHub，`git fetch/push` 必须与电脑当前代理口径保持一致；
- 当前已确认可用的本机代理端口为 `127.0.0.1:7890`；
- 若推送命令长时间无输出，优先排查代理端口是否一致，再排查 PAT/凭据问题。

### 阶段 C：GitHub Actions 自动打包

目标：每次推送后自动验证并生成制品，但不自动上线。

建议流水线：

1. `frontend build`
2. `backend build`
3. `package source bundle`
4. 可选 `docker build`

### 阶段 D：受控部署

目标：仅在明确分支或手工批准后部署到云服务器。

建议：

- `develop`：只做构建验证，不发布
- `release/*`：构建候选制品
- `main`：手工确认后发布
- 生产部署必须保留人工闸门

## 6. 分支策略

建议最小分支模型：

- `main`
  - 生产基线
- `develop`
  - 日常集成
- `feature/*`
  - 功能开发
- `hotfix/*`
  - 线上修复

规则：

- 新功能必须从 `develop` 拉出
- 线上修复必须走 `hotfix/*`
- 未经确认不得直接合并到 `main`
- 与飞书 / OpenClaw 整合相关开发建议单独用 `feature/feishu-openclaw-mvp`

## 7. `.gitignore` 建议

至少忽略以下内容：

```gitignore
# Node
node_modules/
npm-debug.log*

# Build
dist/
coverage/

# Env
.env
.env.*
!.env.example

# OS / IDE
.DS_Store
.idea/
.vscode/

# Temp
*.tar
*.zip
tmp/

# Frontend local artifacts
frontend/dist/
frontend/node_modules/

# Backend local artifacts
backend/dist/
backend/node_modules/
```

## 8. 自动化最小方案

MVP 阶段建议只做三类事情：

- 构建前端
- 构建后端
- 打包源代码制品

不在第一版做：

- 自动 SSH 上线
- 自动改线上环境变量
- 自动重建生产数据库

说明：

- 当前本地目录中已经补了 `.gitlab-ci.yml`，它只是构建思路样板；
- 正式接入 GitHub 时，应将其迁移为 `.github/workflows/*.yml`。

## 9. 建议制品策略

第一阶段可选两种制品模式：

### 模式 A：构建压缩包

产出：

- `presales-platform-source.tar.gz`

优点：

- 简单、直观
- 适合当前已有“打包上传服务器”的发布方式

### 模式 B：Docker 镜像

产出：

- `frontend:<tag>`
- `backend:<tag>`

优点：

- 更适合后续标准化发布
- 更容易接云端自动部署

建议：

- 先做模式 A，保持和当前云端发布习惯一致
- 再逐步升级到模式 B

## 10. 与当前云服务器发布流程的关系

当前云端已经有稳定的“最小压缩包 + Docker Compose 重建”流程，因此 GitHub 第一阶段不替代它，只增强它：

- 现在：本地打包 -> 上传 -> 云端重建
- 第一阶段后：GitHub 自动打包 -> 下载制品 -> 云端重建
- 第二阶段后：GitHub 手工批准 -> 自动上传并重建

这样能保证：

- 不打断当前生产修复能力
- 不因 CI 误触发导致线上抖动

## 11. 推荐实施顺序

### 第一步：整理代码边界

- 建立独立项目根目录
- 搬运平台文件
- 补 `.gitignore`

### 第二步：接入 GitHub

- 新建 GitHub 仓库
- 初始化 Git
- 首次推送

### 第三步：接入最小自动化

- 前端构建
- 后端构建
- 制品打包

### 第四步：增加手工发布流水线

- 下载制品
- 上传服务器
- 执行 `docker compose up -d`

## 12. 风险点

- 仓库边界不清，误纳入家目录内容
- `.env`、密钥、证书被误提交
- 自动部署过早接入，影响线上稳定
- GitHub HTTPS 推送通常使用 Personal Access Token，而不是账户密码
- 当前根目录 `package.json` 仅为占位，不应作为最终 monorepo 入口设计依据

## 13. 推荐结论

最稳的路径是：

1. **先新建独立平台目录，不在 `/Users/gjy` 家目录直接初始化 Git**
2. **先做 GitHub 托管和自动打包，不做自动上线**
3. **等仓库结构、忽略规则、制品稳定后，再接入手工批准发布**

## 14. 下一步可直接执行的内容

如果进入实施，可按以下顺序落地：

1. 创建独立目录 `presales-platform/`
2. 搬运平台代码
3. 生成 `.gitignore`
4. 初始化 Git
5. 新建 GitHub 仓库并添加 `origin`
6. 将当前 `.gitlab-ci.yml` 迁移为 GitHub Actions 工作流
7. 首次推送并验证自动构建

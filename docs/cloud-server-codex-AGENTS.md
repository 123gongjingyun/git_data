# Server Codex Conventions

## 环境定位
- 当前服务器为 Ubuntu 22.04 云服务器。
- 当前业务项目目录固定为 `/opt/presales-platform`。
- 当前平台采用单机 Docker Compose 部署，服务拓扑为：
  - `mysql`
  - `backend`
  - `frontend`
- 公网访问地址当前为 `http://101.43.78.27/`。
- 当前阶段仍处于“平台上云一期”，重点是稳定部署、联调验收和最小化运维。

## 账户分工
- `deploy`
  - 负责 `/opt/presales-platform` 项目维护
  - 负责 `docker compose` 启停、镜像重建、日志排查
  - 负责 Codex CLI 的日常使用
- `claw`
  - 仅用于既有 `openclaw` 运行
  - 不参与 `presales-platform` 项目日常部署和 Codex 改动
- `root`
  - 只用于系统级安装、权限修复、应急维护
  - 非必要不要直接使用 `root` 运行 Codex

## Codex 安装与配置约定
- Codex CLI 安装在 `deploy` 用户下。
- 当前 Codex 可执行文件路径为：
  - `/home/deploy/.npm-global/bin/codex`
- Codex 配置目录固定为：
  - `/home/deploy/.codex`
- Codex 用户配置文件固定为：
  - `/home/deploy/.codex/config.toml`
- OpenAI API Key 环境文件固定为：
  - `/home/deploy/.openai-env`

## Codex 运行规则
- 运行 Codex 前，优先确认当前用户为 `deploy`。
- 运行 Codex 前，优先进入项目目录：
  - `cd /opt/presales-platform`
- 非必要不要在项目目录外运行 Codex。
- 非必要不要把本机开发环境中的完整 MCP 配置直接复制到服务器。
- 当前服务器上的 Codex 以最小配置运行为主，优先保证稳定性，不追求复杂扩展。

## 当前推荐配置
- 当前服务器上的 Codex 推荐使用以下策略：
  - `model = "gpt-5.4"`
  - `approval_policy = "on-request"`
  - `sandbox_mode = "workspace-write"`
  - `multi_agent = false`
- 在未明确需要前，不启用复杂浏览器类 MCP。
- 后续如需补装，仅优先考虑：
  - `fetch`
  - `context7`

## 项目操作边界
- 仅修改与当前任务直接相关的文件。
- 优先做增量修复，不做大范围重构。
- 未经明确确认，不变更以下内容：
  - 服务器账户分工
  - Docker Compose 服务拓扑
  - 公网访问入口
  - `openclaw` 运行账户和目录
- 未经明确确认，不在服务器上引入新的常驻服务、systemd unit、守护进程或计划任务。

## Docker 与部署规则
- 当前项目统一通过 Docker Compose 运维。
- 常用操作目录固定为：
  - `/opt/presales-platform`
- 允许执行的常见操作包括：
  - `docker compose ps`
  - `docker compose logs`
  - `docker compose build`
  - `docker compose up -d`
  - `docker compose down`
- 对于会删除数据的动作必须特别谨慎，例如：
  - `docker compose down -v`
  - 删除 volume
  - 删除数据库数据目录
- 涉及数据删除、卷删除、初始化重建时，必须先明确说明风险。

## 当前已知环境事实
- 当前 `mysql / backend / frontend` 已可正常启动。
- 当前 `http://101.43.78.27/` 可访问前端。
- 当前 `http://101.43.78.27/api/health` 返回正常。
- 当前管理员账号与访客账号已完成过线上验收。
- 当前项目曾出现过以下已修复问题：
  - MySQL 8.4 不接受 `default-authentication-plugin=mysql_native_password`
  - TypeORM `simple-array` 字段在 MySQL 8.4 下映射为 `TEXT`，不能设置默认值
  - 前端接口路径曾出现 `/api//workflow-definitions` 双斜杠问题

## 文档维护规则
- 每次完成一个明确任务后，必须同步更新项目 `README.md` 中的任务进度。
- 如果修改了部署方式、账户约定、访问地址、配置文件位置，也必须同步更新 `README.md`。
- 如果当前会话只是在服务器侧做环境修复或工具安装，也要把结果写入 `README.md`，避免后续会话丢失上下文。

## 与 openclaw 的隔离约定
- 不修改 `claw` 用户现有 `openclaw` 环境，除非任务明确要求。
- 不复用 `claw` 的配置目录、虚拟环境或运行脚本来承载 Codex。
- Codex 与 `openclaw` 保持账户、配置、职责隔离。

## 安全约定
- 默认不使用 `root` 直接运行 Codex。
- 默认不在不确认影响范围的情况下执行破坏性命令。
- 默认不暴露 API Key 到共享文档、日志或项目文件中。
- 如果需要修改权限、系统包、用户目录或系统配置，先说明原因和影响范围。

## 建议工作流
1. 确认当前用户为 `deploy`
2. 进入 `/opt/presales-platform`
3. 阅读 `README.md`
4. 明确当前任务边界
5. 先做最小修改
6. 做最相关验证
7. 更新 `README.md`
8. 输出结果与后续建议

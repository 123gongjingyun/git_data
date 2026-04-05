# 本地开发与云端发布回传约定

适用范围：
- 项目：售前流程全生命周期管理系统
- 当前阶段：平台上云一期
- 本地开发目录：`/Users/gjy`
- 云服务器项目目录：`/opt/presales-platform`
- 云服务器访问地址：`http://101.43.78.27/`

## 1. 目标

本文件用于统一以下三类场景的执行口径：
- 日常功能开发优先放在本地完成；
- 云服务器只承担部署、联调、环境修复和最终验收；
- 如在云服务器发生应急修复，必须把修复结果回传到本地代码与 `README.md`，避免环境漂移。

## 2. 当前环境分工

本地：
- 主要开发环境
- 优先完成代码修改、构建验证、文档更新
- 优先运行浏览器验收与前端细节调整

云服务器：
- 只承担部署与线上联调
- 当前部署目录固定为 `deploy@101.43.78.27:/opt/presales-platform`
- 当前运行拓扑固定为 `mysql + backend + frontend`

账户职责：
- `deploy`
  - 负责平台项目部署、Docker Compose 运维、Codex CLI
- `claw`
  - 仅负责既有 `openclaw`
- `root`
  - 仅用于系统级安装、权限修复和应急维护

结论：
- 默认优先在本地运行 Codex，减少云服务器 `2C2G` 资源压力。
- 只有当问题与云端环境、容器状态、线上日志、系统权限直接相关时，才切到云服务器上的 Codex。

## 3. 推荐工作流

### 3.1 日常开发

推荐顺序：
1. 在本地 `/Users/gjy` 阅读 `README.md`，确认当前任务与最新约束。
2. 在本地完成代码修改。
3. 在本地执行最相关验证，例如：
   - `cd /Users/gjy/frontend && npm run build`
   - `cd /Users/gjy/backend && npm run build`
   - `cd /Users/gjy/backend && npm test`
4. 本地同步更新 `README.md`。
5. 整理最小上传包并发布到云服务器。
6. 在云服务器执行 `docker compose build`、`docker compose up -d`、健康检查和公网验收。

### 3.2 云端发布

常用发布路径：
1. 在本地更新代码和文档。
2. 生成最小上传包。
3. 上传到 `deploy@101.43.78.27:/opt/presales-platform/`。
4. 在云服务器解压并覆盖项目文件。
5. 进入 `/opt/presales-platform` 执行容器构建和重启。
6. 检查：
   - `docker compose ps`
   - `docker compose logs --tail=200 backend`
   - `docker compose logs --tail=200 frontend`
   - `docker compose logs --tail=200 mysql`
   - `curl http://127.0.0.1/api/health`
   - `curl http://101.43.78.27/api/health`

### 3.3 云端应急修复回传

如果必须在云服务器直接改代码，执行顺序必须是：
1. 先在服务器完成最小修复并验证；
2. 立即把相同修改同步回本地 `/Users/gjy`；
3. 立即更新本地 `README.md`，记录修复原因、改动点和验证结果；
4. 后续继续以本地版本为主，不以服务器目录作为长期真源。

禁止做法：
- 长期只改云服务器代码、不回传本地；
- 把云服务器目录当作唯一主仓；
- 在本地和云端分别演化出两套不一致代码。

## 4. 典型场景与处理原则

### 4.1 前端页面、样式、交互问题

处理原则：
- 优先本地改
- 本地 `npm run build`
- 本地浏览器验收
- 再上传云端发布

### 4.2 后端业务逻辑、接口、实体结构问题

处理原则：
- 优先本地改
- 本地 `npm run build` 或 `npm test`
- 如涉及 MySQL 兼容性，再到云端容器联调

### 4.3 Dockerfile、docker-compose、Nginx 代理问题

处理原则：
- 代码文件仍以本地修改为主
- 最终验证必须在云端执行
- 线上临时修复后必须回传本地

### 4.4 服务器系统问题

例如：
- Docker/Compose 未安装
- 权限错误
- 防火墙或安全组
- 磁盘、内存、swap
- 用户 PATH / API Key / Codex 配置

处理原则：
- 这类问题可直接在云服务器处理
- 但结果必须写回 `README.md` 和对应运维文档

## 5. Codex 使用约定

### 5.1 本地 Codex

适用于：
- 日常研发
- 多文件代码修改
- 前端调试
- 文档整理
- 浏览器自动化验收

优点：
- 不占用云服务器计算资源
- 工具链更完整
- 回写代码与文档更方便

### 5.2 云服务器 Codex

适用于：
- 查线上容器状态
- 查部署目录与环境变量
- 看 `docker compose logs`
- 做少量服务器侧修复
- 调整 `deploy` 用户下的 Codex 配置

不适用于：
- 长时间重构
- 大量前端调试
- 重浏览器依赖场景
- 大规模 MCP 扩展

## 6. 当前服务器侧 Codex 文档位置

本地源文档：
- `/Users/gjy/docs/cloud-server-codex-AGENTS.md`
- `/Users/gjy/docs/cloud-server-codex-SERVER_CONVENTIONS.md`

云服务器目标文档：
- `/opt/presales-platform/AGENTS.md`
- `/home/deploy/.codex/SERVER_CONVENTIONS.md`

用途说明：
- `/opt/presales-platform/AGENTS.md`
  - 约束服务器上进入项目目录后的 Codex 行为边界
- `/home/deploy/.codex/SERVER_CONVENTIONS.md`
  - 记录 `deploy` 用户下 Codex CLI 的安装位置、配置与最小运维规则

## 7. 当前服务器侧 Codex 配置策略

当前建议保留轻量配置，不直接整份覆盖为高成本配置。

推荐方向：
```toml
model_provider = "openai_proxy"
model = "gpt-5.4"
review_model = "gpt-5.4"
model_reasoning_effort = "medium"
model_verbosity = "medium"
disable_response_storage = true

approval_policy = "on-request"
sandbox_mode = "workspace-write"

[model_providers.openai_proxy]
name = "OpenAI Proxy"
base_url = "https://code.heihuzi.ai/"
wire_api = "responses"
requires_openai_auth = true

[features]
multi_agent = false
```

说明：
- 保留代理接入信息；
- 保留服务器侧安全运行参数；
- 不建议在云服务器默认使用 `xhigh` 推理强度；
- 修改 `config.toml` 后，重启 Codex CLI 即可生效，不需要重启 Docker 或服务器。

## 8. 发布前后核对清单

发布前：
- `README.md` 已更新
- 本地相关构建已通过
- 上传包只包含最小必要文件
- 当前改动已经明确是否需要云端重建镜像

发布后：
- `docker compose ps` 正常
- `curl http://127.0.0.1/api/health` 正常
- `curl http://101.43.78.27/api/health` 正常
- 浏览器可打开 `http://101.43.78.27/`
- 如涉及权限、配置、部署路径变化，已同步更新 `README.md`

## 9. 当前结论

当前阶段的标准执行方式为：
- 研发主阵地在本地；
- 云服务器以部署和验收为主；
- 云端应急修复必须回传本地；
- 所有关键路径和约定统一沉淀到 `README.md` 与本文件，避免后续会话重复踩坑。

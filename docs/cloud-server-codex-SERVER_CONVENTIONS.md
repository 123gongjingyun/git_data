# Cloud Server Codex Notes

## 用途
- 本文件用于记录云服务器上 Codex CLI 的安装位置、账户边界、最小配置和常用操作。
- 本文件不替代项目级 `AGENTS.md`，而是作为 `deploy` 用户的服务器侧运维备忘。

## 服务器信息
- 操作系统：Ubuntu 22.04
- 项目目录：`/opt/presales-platform`
- 公网访问：`http://101.43.78.27/`

## 账户边界
- `deploy`
  - 负责平台部署、Docker Compose、Codex CLI、项目代码维护
- `claw`
  - 仅负责 `openclaw`
- `root`
  - 仅负责系统级安装、权限调整和应急修复

## Codex CLI 现状
- 安装用户：`deploy`
- 命令路径：`/home/deploy/.npm-global/bin/codex`
- 配置目录：`/home/deploy/.codex`
- 主配置文件：`/home/deploy/.codex/config.toml`
- API Key 文件：`/home/deploy/.openai-env`

## 当前推荐配置
```toml
model = "gpt-5.4"
model_reasoning_effort = "medium"
model_verbosity = "medium"

approval_policy = "on-request"
sandbox_mode = "workspace-write"

[features]
multi_agent = false
```

## Shell 约定
- 建议在 `~/.bashrc` 中包含：
```bash
source "$HOME/.openai-env"
export PATH="$HOME/.npm-global/bin:$PATH"
```
- 新 SSH 会话若未自动生效，可手工执行：
```bash
source ~/.openai-env
export PATH="$HOME/.npm-global/bin:$PATH"
```

## 建议启动方式
```bash
cd /opt/presales-platform
codex
```

## Docker 常用命令
```bash
cd /opt/presales-platform
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
docker compose logs --tail=200 mysql
docker compose build backend
docker compose build frontend
docker compose up -d
```

## 高风险命令提醒
- 以下操作必须谨慎：
  - `docker compose down -v`
  - `docker volume rm ...`
  - 删除数据库数据目录
  - 用 `root` 直接运行 Codex 修改项目文件

## 与 openclaw 并存原则
- 不把 Codex 安装到 `claw` 用户下。
- 不复用 `openclaw` 的目录、虚拟环境或进程管理方式。
- 需要扩展 Codex 能力时，优先在 `deploy` 用户下独立补装，而不是改 `claw` 环境。

## 可选后续增强
- 当前 `uv/uvx` 可暂不安装，不影响 Codex CLI 基本使用。
- 后续若需要补 MCP，建议优先尝试：
  - `fetch`
  - `context7`
- 暂不建议在服务器首轮就补装：
  - `playwright`
  - `chrome-devtools`
  - 其他依赖浏览器或 GUI 的 MCP

## 维护要求
- 服务器侧环境变更完成后，应同步更新项目 `README.md`。
- 若 Codex 配置、账户分工、访问地址或部署方式发生变化，也应同步更新本文件。

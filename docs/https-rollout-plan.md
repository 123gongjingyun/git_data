# 域名 HTTPS 接入任务清单与实施方案

适用范围：
- 项目：售前流程全生命周期管理系统
- 云服务器：`101.43.78.27`
- 服务器项目目录：`/opt/presales-platform`
- 域名：`www.getpre.cn`
- 证书目录：`/opt/presales-platform/getpre.cn_nginx`
- 当前状态：域名备案进行中，本文档先用于方案确认与上线前准备，暂不执行正式切换

## 1. 背景与目标

当前平台已完成基于公网 IP 的一期部署联调，现网拓扑固定为：
- `frontend` 容器内 Nginx 提供静态站点；
- `/api/` 由前端容器内 Nginx 反向代理到 `backend:3000`；
- 后端与 MySQL 继续保留单机 `Docker Compose` 拓扑。

本轮目标是在不新增第二层代理、不调整现有业务容器职责的前提下，为域名 `www.getpre.cn` 接入 HTTPS。

目标收口如下：
- `https://www.getpre.cn` 可正常访问前端页面；
- `https://www.getpre.cn/api/*` 可正常访问后端接口；
- `http://www.getpre.cn` 自动 301 跳转到 HTTPS；
- 保持现有 `frontend + backend + mysql` 轻量部署结构不变；
- 上线过程以最小变更、最小重启为原则。

## 2. 当前约束

- 域名当前仍在备案中，备案完成前不执行正式公网域名切换。
- 现阶段允许完成文档、配置草案、检查项与上线命令准备。
- 证书已经放置于 `/opt/presales-platform/getpre.cn_nginx`，但正式启用前仍需再次核对证书文件名、证书链与覆盖域名。
- 现网仍以 `http://101.43.78.27` 作为实际可访问入口；在域名 HTTPS 切换完成前，不应移除 IP 侧可用性验证能力。

## 3. 实施原则

- TLS 终止固定放在现有 `frontend` 容器内的 Nginx。
- 不新增额外 Nginx、Caddy 或云负载均衡层。
- 证书目录通过只读挂载方式注入 `frontend` 容器。
- HTTP 仅保留跳转职责，业务流量统一收口到 HTTPS。
- 后端仍保持内部服务，仅通过 `/api/` 被反向代理访问。

## 4. 待执行任务清单

### 4.1 备案完成前的准备项

- [ ] 确认 `www.getpre.cn` 已完成备案，可用于正式对外访问。
- [ ] 确认 DNS 已将 `www.getpre.cn` 解析到 `101.43.78.27`。
- [ ] 如需支持根域名，确认 `getpre.cn` 也已解析到 `101.43.78.27`。
- [ ] 确认云安全组已放行 TCP `80` 与 `443`。
- [ ] 确认服务器本机防火墙未拦截 `80` 与 `443`。
- [ ] 确认 `/opt/presales-platform/getpre.cn_nginx` 中证书与私钥文件完整可读。
- [ ] 确认证书覆盖域名至少包含 `www.getpre.cn`。
- [ ] 如需支持 `https://getpre.cn`，确认证书 SAN 同时包含 `getpre.cn`。
- [ ] 确认服务器 `.env` 中的 `BACKEND_CORS_ORIGIN` 能切换到 HTTPS 域名。
- [ ] 确认前端继续使用 `FRONTEND_VITE_API_BASE_URL=/api`，不改成写死域名。

### 4.2 备案完成后的执行项

- [ ] 备份服务器上的 `docker-compose.yml`、`frontend/nginx.conf` 与 `.env`。
- [ ] 为 `frontend` 服务增加 `443:443` 端口映射。
- [ ] 为 `frontend` 服务增加证书目录只读挂载。
- [ ] 将 `frontend/nginx.conf` 改为“80 跳转 + 443 提供 HTTPS 服务”的双 server 配置。
- [ ] 按实际证书文件名更新 `ssl_certificate` 与 `ssl_certificate_key`。
- [ ] 将后端 `BACKEND_CORS_ORIGIN` 更新为 `https://www.getpre.cn`。
- [ ] 如需保留过渡期兼容，再评估是否暂时保留 `http://101.43.78.27` 在 CORS 白名单中。
- [ ] 执行 `docker compose config` 校验配置。
- [ ] 执行最小范围重建：优先仅重建 `frontend`；如 `.env` 影响后端，再重启 `backend`。
- [ ] 使用 `curl` 验证 `http -> https` 跳转与 `/api/health`。
- [ ] 使用浏览器验证证书、登录、刷新、关键接口与控制台无 Mixed Content。
- [ ] 验收通过后，再决定是否开启 HSTS。

## 5. 配置改造方案

### 5.1 `docker-compose.yml`

`frontend` 服务应补充：
- `443:443` 端口映射；
- 将宿主机 `/opt/presales-platform/getpre.cn_nginx` 挂载到容器 `/etc/nginx/certs`；
- 挂载方式使用只读。

示例结构：

```yaml
frontend:
  build:
    context: ./frontend
    args:
      VITE_API_BASE_URL: ${FRONTEND_VITE_API_BASE_URL}
  container_name: presales-frontend
  restart: unless-stopped
  depends_on:
    - backend
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - /opt/presales-platform/getpre.cn_nginx:/etc/nginx/certs:ro
```

### 5.2 `frontend/nginx.conf`

建议拆为两个核心 `server`：

1. `listen 80`
- 仅负责把 `http://www.getpre.cn` 跳转到 `https://www.getpre.cn`

2. `listen 443 ssl http2`
- 加载证书与私钥；
- 静态站点根目录仍为 `/usr/share/nginx/html`；
- `/api/` 继续反向代理到 `http://backend:3000/`；
- 继续保留 `SPA` 的 `try_files` 路由回退。

如证书仅覆盖 `www.getpre.cn`，先只接入 `www`，不要强行把 `getpre.cn` 也切到 HTTPS。

### 5.3 后端环境变量

备案完成后，`.env` 中应重点核对：

```env
FRONTEND_VITE_API_BASE_URL=/api
BACKEND_CORS_ORIGIN=https://www.getpre.cn
```

如后端支持多来源白名单，过渡期可以考虑临时保留：

```env
BACKEND_CORS_ORIGIN=https://www.getpre.cn,https://getpre.cn,http://101.43.78.27
```

最终正式口径仍建议以域名 HTTPS 为主。

## 6. 上线执行步骤

以下步骤仅在备案完成后执行。

1. 登录服务器并进入项目目录：

```bash
cd /opt/presales-platform
```

2. 备份关键文件：

```bash
cp docker-compose.yml docker-compose.yml.bak-20260401
cp frontend/nginx.conf frontend/nginx.conf.bak-20260401
cp .env .env.bak-20260401
```

3. 核对证书目录内容：

```bash
ls -lah /opt/presales-platform/getpre.cn_nginx
```

4. 修改 `docker-compose.yml`、`frontend/nginx.conf`、`.env`

5. 校验 Compose 配置：

```bash
docker compose config
```

6. 最小范围发布：

```bash
docker compose up -d --build frontend
```

7. 如后端 `.env` 已改且需重新载入环境变量：

```bash
docker compose up -d backend
```

8. 检查状态与日志：

```bash
docker compose ps
docker compose logs --tail=200 frontend
docker compose logs --tail=200 backend
```

## 7. 验收清单

### 7.1 命令行验收

```bash
curl -I http://www.getpre.cn
curl -Ik https://www.getpre.cn
curl -Ik https://www.getpre.cn/api/health
```

预期结果：
- `http://www.getpre.cn` 返回 `301`；
- `https://www.getpre.cn` 返回 `200`；
- `https://www.getpre.cn/api/health` 返回 `200`。

如需支持根域名，再补测：

```bash
curl -I http://getpre.cn
curl -Ik https://getpre.cn
```

### 7.2 浏览器验收

- [ ] 浏览器访问 `https://www.getpre.cn`，地址栏出现锁标识。
- [ ] 登录成功。
- [ ] 刷新后登录态正常恢复。
- [ ] 关键页面可正常加载数据。
- [ ] 浏览器控制台无 Mixed Content 报错。
- [ ] 网络面板中 `/api/auth/login`、`/api/auth/me`、`/api/health` 请求正常。

## 8. 风险与回退

### 8.1 主要风险

- 证书文件名与 Nginx 配置不一致；
- 证书不包含 `www.getpre.cn` 或根域名；
- 云安全组未放通 `443`；
- 后端 `CORS_ORIGIN` 仍停留在 IP 或 HTTP；
- 页面引用残留 `http://` 资源导致 Mixed Content。

### 8.2 回退策略

如上线后异常，可按以下方式快速回退：

1. 恢复备份的 `docker-compose.yml`、`frontend/nginx.conf`、`.env`
2. 重启对应容器：

```bash
docker compose up -d --build frontend
docker compose up -d backend
```

3. 保留 IP 入口 `http://101.43.78.27` 作为临时访问与排障通道

## 9. 后续建议

- HTTPS 稳定运行后，再考虑启用 HSTS。
- 若后续证书需要自动续期，再单独评估续期方式，不在本轮备案待完成阶段内展开。
- 备案完成并正式上线后，应同步更新 `README.md`、发布手册和线上验收记录。

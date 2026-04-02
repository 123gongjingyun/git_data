# 平台上云一期最小上传包与检查清单

适用范围：
- 目标服务器：`101.43.78.27`
- 部署目录：`/opt/presales-platform`
- 部署方式：单机 `Docker Compose`

## 1. 上传原则

本次上传只带部署必须文件，不上传以下内容：
- 本地 `node_modules`
- 前端 `dist`
- 后端 `dist`
- 本地 SQLite 数据库文件
- 无关个人目录与缓存目录
- 本地日志与临时文件

目标是把上传包控制在“能部署、能构建、能联调”的最小范围。

## 2. 必须上传的文件与目录

项目根目录下只需要这些内容：

- `frontend/`
- `backend/`
- `docs/`
- `docker-compose.yml`
- `.env.example`
- `README.md`

其中：
- `frontend/` 需要保留 `src/`、`package.json`、`package-lock.json`、`.npmrc`、`Dockerfile`、`nginx.conf`、`.env.example`
- `backend/` 需要保留 `src/`、`package.json`、`package-lock.json`、`.npmrc`、`Dockerfile`、`.env.example`、`tsconfig*.json`、`nest-cli.json`

## 3. 本地打包命令

在本地执行：

```bash
cd /Users/gjy
tar --exclude='frontend/node_modules' \
    --exclude='frontend/dist' \
    --exclude='frontend/.env.local' \
    --exclude='frontend/pre-sales-system/node_modules' \
    --exclude='backend/node_modules' \
    --exclude='backend/dist' \
    --exclude='backend/.env' \
    --exclude='pre_sales_lifecycle.sqlite' \
    --exclude='*.log' \
    -czf presales-platform-phase1.tar.gz \
    frontend \
    backend \
    docs \
    docker-compose.yml \
    .env.example \
    README.md
```

打包完成后，本地检查压缩包是否生成：

```bash
ls -lh /Users/gjy/presales-platform-phase1.tar.gz
```

## 4. 上传命令

```bash
scp /Users/gjy/presales-platform-phase1.tar.gz deploy@101.43.78.27:/opt/presales-platform/
```

如果服务器仍使用 `root` 上传，也可以：

```bash
scp /Users/gjy/presales-platform-phase1.tar.gz root@101.43.78.27:/opt/presales-platform/
```

## 5. 服务器解压命令

登录服务器后执行：

```bash
cd /opt/presales-platform
tar -xzf presales-platform-phase1.tar.gz
```

## 6. 解压后目录检查

执行：

```bash
cd /opt/presales-platform
ls -la
ls -la frontend
ls -la backend
```

期望看到：
- 根目录下有 `frontend`、`backend`、`docs`、`docker-compose.yml`、`.env.example`、`README.md`
- `frontend` 下有 `Dockerfile`、`nginx.conf`、`package.json`、`package-lock.json`、`src`
- `backend` 下有 `Dockerfile`、`package.json`、`package-lock.json`、`src`

## 7. 上传前自检清单

上传前逐项确认：

- [ ] 本地前端构建已通过：`cd /Users/gjy/frontend && npm run build`
- [ ] 本地后端构建已通过：`cd /Users/gjy/backend && npm run build`
- [ ] `frontend/src` 中没有残留写死的 `http://localhost:3000`
- [ ] 项目根目录存在 `docker-compose.yml`
- [ ] 项目根目录存在 `.env.example`
- [ ] `frontend/Dockerfile` 与 `backend/Dockerfile` 已存在
- [ ] 压缩包不包含 `node_modules`
- [ ] 压缩包不包含 `dist`
- [ ] 压缩包不包含本地 SQLite 文件

## 8. 上传后自检清单

上传并解压后逐项确认：

- [ ] `/opt/presales-platform/docker-compose.yml` 存在
- [ ] `/opt/presales-platform/.env.example` 存在
- [ ] `/opt/presales-platform/frontend/Dockerfile` 存在
- [ ] `/opt/presales-platform/frontend/nginx.conf` 存在
- [ ] `/opt/presales-platform/backend/Dockerfile` 存在
- [ ] `/opt/presales-platform/backend/src` 存在
- [ ] `/opt/presales-platform/frontend/src` 存在
- [ ] 已复制 `.env.example` 为 `.env`
- [ ] `.env` 中数据库密码、JWT、CORS 已按服务器实际值填写

## 9. 启动前最后检查

在服务器执行以下命令确认环境无误：

```bash
cd /opt/presales-platform
docker --version
docker compose version
cat .env
```

注意：
- `BACKEND_CORS_ORIGIN` 应为 `http://101.43.78.27`
- `FRONTEND_VITE_API_BASE_URL` 应为 `/api`
- 首次建表如果没有历史库，建议先把 `BACKEND_DB_SYNCHRONIZE=true`

## 10. 启动命令

```bash
cd /opt/presales-platform
docker compose --env-file .env up -d --build
```

## 11. 首次启动后检查

```bash
docker compose ps
curl http://127.0.0.1/api/health
docker compose logs backend --tail=100
```

若 `curl http://127.0.0.1/api/health` 返回正常，再从浏览器访问：

```text
http://101.43.78.27/
```

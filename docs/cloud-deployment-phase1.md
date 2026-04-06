# 平台上云一期部署手册

适用范围：
- 项目：售前流程全生命周期管理系统
- 阶段：平台上云一期
- 部署目标：先完成平台本体上云与公网 IP 联调，不接入 `openclaw`、飞书与平台内监控页
- 服务器规格：`2C2G / 50GB / Ubuntu 22.04 / 公网 IP 101.43.78.27`

## 1. 本期部署目标

本期只部署以下四个组件：
- `frontend`：React + Vite 构建后的前端静态站点
- `backend`：NestJS 后端 API
- `mysql`：同机 MySQL
- `nginx`：由前端容器内 Nginx 承担静态资源托管与 `/api` 反向代理

本期不部署：
- `openclaw`
- 飞书集成
- Prometheus / Grafana / Node Exporter
- 平台内系统监控页面

## 2. 首轮架构与访问方式

公网访问入口统一为：
- `http://101.43.78.27/`

服务路由约定：
- `/` -> 前端静态页面
- `/api/*` -> 反向代理到 NestJS 后端

首轮部署拓扑：
- 公网 -> `80/tcp`
- `frontend` 容器对外暴露 `80`
- `frontend` 容器内 Nginx 转发 `/api` 到 `backend:3000`
- `backend` 通过容器网络访问 `mysql:3306`

安全原则：
- 后端 `3000` 不暴露公网
- MySQL `3306` 不暴露公网

## 3. 开放端口方案

云厂商安全组与系统防火墙统一按以下规则配置。

允许放通：
- `22/tcp`：SSH
- `80/tcp`：平台入口

暂不放通：
- `443/tcp`
- `3000/tcp`
- `3306/tcp`

结论：
- 外部用户只能访问 `http://101.43.78.27/`
- 后端和数据库都只在容器内部网络通信

## 4. 服务器初始化

### 4.1 登录服务器

```bash
ssh root@101.43.78.27
```

### 4.2 创建部署用户

```bash
adduser deploy
usermod -aG sudo deploy
```

安装 Docker 后，再把用户加入 Docker 用户组：

```bash
usermod -aG docker deploy
```

## 5. 安装 Docker 与 Docker Compose

```bash
apt update
apt install -y ca-certificates curl gnupg lsb-release ufw
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
docker --version
docker compose version
```

## 6. 配置防火墙

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw enable
ufw status
```

## 7. 代码上传建议

不要把整个 `/Users/gjy` 目录直接上传到服务器。建议只上传以下内容：
- `frontend/`
- `backend/`
- `docs/`
- `docker-compose.yml`
- `.env.example`
- `README.md`

服务器目标目录：

```bash
sudo mkdir -p /opt/presales-platform
sudo chown -R deploy:deploy /opt/presales-platform
```

## 8. 本地打包上传建议

在本地项目根目录执行：

```bash
cd /Users/gjy
tar --exclude='frontend/node_modules' \
    --exclude='frontend/dist' \
    --exclude='backend/node_modules' \
    --exclude='backend/dist' \
    -czf presales-platform-phase1.tar.gz \
    frontend \
    backend \
    docs \
    docker-compose.yml \
    .env.example \
    README.md
```

上传到服务器：

```bash
scp /Users/gjy/Projects-mygetpre/presales-platform-phase1.tar.gz deploy@101.43.78.27:/opt/presales-platform/
```

服务器上解压：

```bash
su - deploy
cd /opt/presales-platform
tar -xzf presales-platform-phase1.tar.gz
```

## 9. 环境变量准备

在服务器项目目录中复制模板文件：

```bash
cd /opt/presales-platform
cp .env.example .env
```

编辑 `.env`：

```bash
nano .env
```

建议首轮使用以下配置：

```env
MYSQL_ROOT_PASSWORD=Root@12345678
MYSQL_DATABASE=pre_sales_lifecycle
MYSQL_USER=presales
MYSQL_PASSWORD=Presales@123456

BACKEND_NODE_ENV=production
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000
BACKEND_CORS_ORIGIN=http://101.43.78.27
BACKEND_JWT_SECRET=ReplaceThisWithALongRandomSecret_20260328
BACKEND_JWT_EXPIRES_IN=2h
BACKEND_DB_TYPE=mysql
BACKEND_DB_HOST=mysql
BACKEND_DB_PORT=3306
BACKEND_DB_USER=presales
BACKEND_DB_PASSWORD=Presales@123456
BACKEND_DB_NAME=pre_sales_lifecycle
BACKEND_DB_SYNCHRONIZE=false

FRONTEND_VITE_API_BASE_URL=/api
```

首轮若数据库是第一次初始化，建议第一次启动前临时设置：

```env
BACKEND_DB_SYNCHRONIZE=true
```

等表结构初始化成功后，再改回：

```env
BACKEND_DB_SYNCHRONIZE=false
```

## 10. 首次启动

```bash
cd /opt/presales-platform
docker compose --env-file .env up -d --build
```

查看状态：

```bash
docker compose ps
```

正常期望：
- `presales-mysql` 已启动
- `presales-backend` 已启动
- `presales-frontend` 已启动

## 11. 首次验证

### 11.1 在服务器本机验证

```bash
curl http://127.0.0.1/
curl http://127.0.0.1/api/health
```

预期：
- `/` 返回前端 HTML
- `/api/health` 返回类似 `{"status":"ok"}`

### 11.2 在浏览器验证

打开：

```text
http://101.43.78.27/
```

重点检查：
- 登录页能否打开
- 登录接口是否正常
- 工作台是否正常进入
- 系统设置是否能读取数据
- 知识库目录是否能加载
- 顶栏通知与品牌配置是否正常

## 12. 常用运维命令

查看容器状态：

```bash
docker compose ps
```

查看前端日志：

```bash
docker compose logs frontend --tail=200
```

查看后端日志：

```bash
docker compose logs backend --tail=200
```

查看数据库日志：

```bash
docker compose logs mysql --tail=200
```

重启全部服务：

```bash
docker compose restart
```

只重启后端：

```bash
docker compose restart backend
```

更新代码后重新部署：

```bash
docker compose down
docker compose --env-file .env up -d --build
```

## 13. 常见问题排查

### 13.1 页面打不开

检查：
- 安全组是否放通 `80`
- `ufw` 是否放通 `80`
- `docker compose ps` 中 `frontend` 是否为 `Up`

### 13.2 `/api/health` 失败

检查：
- `backend` 容器是否启动
- `frontend` 容器里的 Nginx 反向代理是否生效
- 后端是否因数据库连接失败而退出

### 13.3 后端启动失败

优先检查：
- `.env` 中数据库用户名/密码是否一致
- `DB_HOST` 是否为 `mysql`
- MySQL 容器是否健康
- 首次建表时是否需要临时开启 `BACKEND_DB_SYNCHRONIZE=true`

### 13.4 登录失败但页面能打开

优先检查：
- 浏览器开发者工具中的 `/api/auth/login` 请求状态
- `backend` 日志中的鉴权或数据库报错
- 是否初始化了演示账号数据

## 14. 数据库备份与恢复

备份：

```bash
docker exec presales-mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" pre_sales_lifecycle' > /opt/presales-platform/backup-$(date +%F-%H%M%S).sql
```

恢复：

```bash
cat /opt/presales-platform/backup-xxxx.sql | docker exec -i presales-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" pre_sales_lifecycle'
```

## 15. 回滚策略

首轮回滚采用最简单方案：
- 部署前先备份数据库
- 保留上一版代码压缩包
- 新版本异常时执行 `docker compose down`
- 切回上一版代码
- 重新执行 `docker compose --env-file .env up -d --build`

## 16. 本期完成标准

满足以下条件即视为“平台上云一期”完成：
- 服务器已完成 Docker 化部署
- 仅开放 `22` 与 `80`
- 浏览器可通过 `http://101.43.78.27/` 访问前端
- `http://101.43.78.27/api/health` 返回正常
- 登录、工作台、知识库、系统设置至少完成一轮联调验证
- 具备最小日志查看、重启、备份与回滚能力

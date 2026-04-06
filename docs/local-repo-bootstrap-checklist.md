# 本地仓库收口清单

## 当前状态

- 已创建独立目录：`/Users/gjy/Projects-mygetpre/presales-platform`
- 旧路径 `/Users/gjy/presales-platform` 已保留为软链接兼容入口
- 已复制平台核心内容：
  - `README.md`
  - `docs/`
  - `frontend/`
  - `backend/`
  - `docker-compose.yml`
- 已排除本地产物：
  - `node_modules/`
  - `dist/`
  - `__MACOSX/`

## 已补文件

- `.gitignore`
- `.env.example`
- `.gitlab-ci.yml`

## 下一步

1. 在新目录执行 `git init`
2. 配置默认分支为 `main`
3. 检查 `git status`，确认未纳入无关文件
4. 新建 GitLab 仓库
5. 添加远程 `origin`
6. 首次提交并推送

## 推送前检查

- 确认未提交真实 `.env`
- 确认未提交证书、数据库、压缩包
- 确认前后端在新目录下都能构建
- 确认 `docker-compose.yml` 相对路径仍正确

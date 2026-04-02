# Pre-sales Lifecycle Platform & OpenClaw Integration

This repository contains a NestJS backend for a pre-sales lifecycle platform.
The project is developed and tested locally first, and then deployed to a
cloud server. In parallel, an OpenClaw agent is deployed on the cloud server
to act as an automation/assistant layer via Feishu (and later WeChat).

## High-level Plan

There are two main work streams:

1. **A-line: Local Platform Development**
   - Develop and stabilize the NestJS backend locally (auth, opportunities,
     knowledge, settings).
   - Optionally develop a minimal frontend for login + opportunity list.
   - Prepare a clean deployment procedure (env vars, build, DB init).

2. **B-line: Cloud OpenClaw + Chat Channels**
   - On the Ubuntu 22.04 cloud server, install and keep OpenClaw running.
   - Integrate OpenClaw with Feishu as the primary chat entry point.
   - Later, after a domain + ICP are ready, integrate with WeChat.

This README mainly tracks B-line (cloud OpenClaw) tasks and gives concrete
commands for B1.

## B-line Milestones

- **B1: Install and run OpenClaw on cloud server (Ubuntu 22.04).**
- **B2: Connect OpenClaw to Feishu (pairing flow, DM usage).**
- **B3: Once the backend is deployed on cloud, add skills for calling this
  platform's HTTP APIs (auth/opportunities/knowledge/settings).**
- **B4: After domain + ICP are ready, add WeChat (official account) channel.**

The rest of this document details B1.

## B1: Install and Run OpenClaw on Cloud Server

Assumptions:

- Cloud server: Ubuntu 22.04 LTS, IP like `101.43.78.27`.
- You will create a non-root user (e.g. `claw`) to run OpenClaw.
- You have an OpenAI (or other provider) API key ready for OpenClaw.

### 1. Create a Non-root User (Optional but Recommended)

SSH into the server as `root`, then:

```bash
adduser claw          # follow prompts to set password
usermod -aG sudo claw # allow sudo if needed
```

Re-login as this user:

```bash
su - claw
```

The following steps assume you are running as `claw`.

### 2. Install Node.js (LTS)

Use NodeSource to install a recent Node.js (e.g. 20.x):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v
```

### 3. Install OpenClaw CLI

Install OpenClaw globally via npm:

```bash
sudo npm install -g openclaw@latest

openclaw --help
```

If the last command prints OpenClaw usage, installation succeeded.

### 4. Initial Onboarding

Run the onboarding wizard to set up OpenClaw configuration under
`~/.openclaw`:

```bash
openclaw onboard
```

In the wizard:

- Select the LLM provider (e.g. OpenAI).
- Enter your API key.
- Accept the default config directory unless you have special needs.

You can rerun `openclaw onboard` anytime if you need to adjust settings.

### 5. Run the OpenClaw Gateway

Start the gateway (the main process that handles channels and agents):

```bash
openclaw gateway
```

For now, you can keep this in the foreground to verify it works. Later,
you should run it under a process manager (e.g. systemd or pm2) so that
it restarts automatically.

In another SSH session, you can check status:

```bash
openclaw status
```

### 6. Next Steps (B2 and Beyond)

Once B1 is done and the gateway runs reliably, the next steps are:

- **B2 (Feishu)**: create a Feishu app (bot), configure appId/appSecret,
  and add a Feishu channel in OpenClaw so you can talk to the agent from
  Feishu.
- **B3 (Platform Skills)**: after your NestJS backend is deployed to the
  cloud, add OpenClaw skills that call the backend's HTTP APIs so that
  Feishu messages can trigger actions on this platform.
- **B4 (WeChat)**: when a domain and ICP filing are ready, configure a
  WeChat Official Account channel in OpenClaw and expose the webhook
  endpoint via your domain.

## B2: Connect OpenClaw to Feishu (High-level)

High-level steps (details depend on Feishu and OpenClaw releases, so
always cross-check with their official docs):

1. **Create a Feishu app (bot):**
   - Go to Feishu developer console.
   - Create an enterprise internal app, enable the "bot" capability.
   - Record the `App ID` and `App Secret`.

2. **Grant permissions and (if needed) events:**
   - In the Feishu console, grant the scopes required for basic bot
     messaging.
   - If OpenClaw requires event subscriptions, configure them according
     to the OpenClaw Feishu channel documentation.

3. **Configure Feishu channel in OpenClaw:**
   - SSH into the cloud server as the OpenClaw user (e.g. `claw`).
   - Run `openclaw onboard` again if the wizard supports configuring
     channels, and fill in the Feishu App ID/Secret when prompted; or
     follow the official OpenClaw docs to edit the config under
     `~/.openclaw` to add a Feishu channel entry.

4. **Restart the gateway and test:**
   - Stop and restart the gateway (for example, stop the current process
     and rerun `openclaw gateway`).
   - In Feishu, add the bot to a chat and send a test message.
   - Verify that OpenClaw receives and responds to messages via Feishu.

## Progress Log

- 2026-03-30:
  - 已完成前端线上回归首轮验证：`解决方案 / 投标管理 / 合同管理` 删除按钮已统一常显，管理员可删除并弹出确认框，`sales_demo` 账号下删除按钮在线置灰不可点。
  - 已完成 `审批流程库 -> 恢复默认模板` 的线上验证：恢复后会写入本地记忆，刷新后仍默认展示标准商机审批流程和标准解决方案审批流程。
  - 线上补测发现残留展示问题：后端返回的部分商机记录缺少客户字段时，会覆盖前端默认样例中的真实客户信息，导致项目/商机/工作台出现“待补充客户 / 未绑定客户”占位文案。
  - 已修复 `frontend/src/shared/opportunityDemoData.ts` 的归一化逻辑：当后端同 ID 商机缺少客户、项目、售前负责人等字段时，自动继承前端默认样例数据，避免占位文案回流，并已完成本地前端构建通过，准备重新部署前端单容器验证。
  - 已继续完成本轮前端迭代并通过本地打包校验：`npm run build -- --outDir /tmp/presales-frontend-build-check` 成功。
  - 已修复“角色基础权限 + 额外授权”链路不一致问题：前后端统一将角色权限、菜单额外授权、动作额外授权合并计算，支持类似 `yage` 账号在经理角色基础上额外开放 `图标/Logo插件库`、`平台品牌与Logo设置` 等入口。
  - 已扩展审批流程库节点配置能力：商机流程节点支持配置 `节点类型（审批/上传/分配）`、`绑定字段`、`字段名称`、`按钮名称`、`审批对象类型/标识`、`节点说明`、`允许驳回`，并增加本地客户端元数据回写，保证新建或编辑流程后再次进入页面仍能保留这些前端配置。
  - 已完成商机审批流程界面改造：审批弹窗改为按流程库节点动态渲染，支持上传需求说明、上传调研文档、分配解决方案负责人、审批通过/驳回，卡片与控件布局已按深浅色主题统一为响应式展示，解决按钮和选择器溢出问题。
  - 已在商机详情页补充审批文档入口：需求说明文档、需求调研文档支持查看与下载；文档预览弹窗已统一适配深浅色模式。
  - 已继续清理多处用户可见的 `Mock / 示例 / 演示态` 文案，覆盖 `项目管理 / 商机管理 / 解决方案 / 投标管理 / 合同管理 / 系统设置 / 图标插件库` 等页面，保留功能说明但去掉影响正式感的提示文字。
  - 已继续优化商机审批流程：节点责任人按流程配置动态解析，非当前处理人仅可查看流程不可操作；节点动作执行后自动写入真实流程记录，并对下一处理人生成站内通知记录与提示。
  - 已修复浅色模式下解决方案审批弹窗仍显示深色评审卡片的问题：`技术评审 / 商务评审 / 审批记录` 已统一改为基于主题变量的浅色表面样式，深浅色模式共用同一套色板逻辑。
  - 已补充本地缓存迁移修复：前端现在会对 `approvalProcessLibrary` 中的旧版默认流程模板按版本自动升级，对 `sharedDemoOpportunities` 中的旧商机审批记录按当前字段状态自动重建，避免继续出现“先审批、后上传需求说明”的脏链路。
  - 已完成线上复测：`OPP-000010` 的审批记录已从“线索确认上传需求说明”起步，后续依次为销售领导审批、解决方案领导审批、分配解决方案负责人；`OPP-000009` 的 6 个节点状态与审批记录已全部对齐，不再出现中间节点待审批、前后节点已完成的错位问题。
  - 已继续优化 `帮助与支持` 页面深浅色适配：整页卡片表面统一切换为主题变量驱动，深色模式下不再出现“快速上手建议”等区域发白、与整体底色割裂的问题。
  - 已顺手清理一批残留的用户可见提示文案：例如 `OpportunitiesView` 中 `新建商机（Mock）`、空列表提示里的 `Mock 数据` 表述已移除，避免影响正式环境观感。
  - 已修复商机列表“审批状态”与流程节点进度口径不一致的问题：前端现按 `workflowRecords + 节点字段` 统一派生审批状态，规则为“未发起=尚未产生任何流程动作；审核中=已启动但最终审批未完成；已批准=最终审批通过；已驳回=任一终止性审批驳回”。线上已验证 `OPP-000010 -> 审核中`、`OPP-000009 -> 已批准`、`OPP-000004 -> 已驳回`。
  - 已继续将商机详情页与同一套审批口径对齐：`商机详情 -> 商机转化流程` 四段摘要不再使用旧硬编码判断，改为复用流程节点派生结果。线上已验证 `OPP-000010` 详情显示“线索确认已上传 / 项目启动已完成审批 / 需求分析进行中 / 最终审批待进入”，`OPP-000009` 详情显示四段全部闭环至“已批准进入方案阶段”。

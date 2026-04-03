# 飞书 / OpenClaw 最小 MVP README

## 1. 前提原则

- 本任务必须建立在“**不影响当前售前管理平台主业务开发、联调、部署**”的前提下推进。
- 当前平台仍是唯一业务主数据源；飞书只作为消息入口、通知入口和轻量审批入口。
- OpenClaw 在 MVP 阶段仅承担“自然语言理解、摘要整理、只读问答”能力，不直接改业务数据。
- 所有审批写操作必须继续由平台后端执行并留痕，不能绕过现有权限与审批实例逻辑。

## 2. MVP 目标

- 在飞书私聊机器人里完成“查待办、看摘要、做审批、收通知”。
- 让经理、管理员、售前在不进入平台页面的情况下完成最常见的审批查看与处理动作。
- 用 OpenClaw 提供最小化自然语言查询能力，验证“机器人 + 助手 + 平台”链路价值。

## 3. MVP 范围

### 3.1 本期必须做

- 飞书自建应用 + 私聊机器人
- 飞书事件回调与卡片回调
- 飞书用户与平台用户绑定
- 待我审批查询
- 商机摘要查询
- 解决方案摘要查询
- 飞书卡片审批通过 / 驳回
- 审批发起、审批结果消息推送
- OpenClaw 只读查询 skill

### 3.2 本期不做

- 飞书 Base 双向同步
- 飞书文档自动生成正式方案正文
- 飞书日历 / 任务 / 群自动创建
- OpenClaw 直接执行写操作
- 多租户、复杂组织同步、复杂 RBAC 映射

## 4. 最小业务闭环

### 4.1 查询链路

1. 用户在飞书私聊机器人发送：
   - `待我审批`
   - `商机 OPP-000010`
   - `解决方案 SOL-000123`
   - `今日简报`
2. 飞书机器人将请求转给平台后端。
3. 平台后端按飞书用户绑定关系定位平台用户。
4. 平台后端返回真实业务摘要。
5. 机器人回卡片消息。

### 4.2 审批链路

1. 用户点击飞书卡片中的 `通过` / `驳回`。
2. 飞书回调平台后端。
3. 平台后端校验：
   - 回调签名合法
   - 飞书用户已绑定平台账号
   - 当前用户确实是当前审批节点处理人
4. 校验通过后执行平台现有审批动作。
5. 平台写审批记录、更新审批实例和业务状态。
6. 飞书卡片刷新为最新状态，并推送结果消息。

## 5. 技术架构

- 飞书应用层
  - 机器人
  - 事件回调
  - 卡片交互回调
- OpenClaw 助手层
  - 只读查询 skill
  - 摘要生成
- 平台后端层
  - NestJS 新增飞书集成模块
  - 调用现有商机 / 解决方案 / 审批模块
- 数据层
  - MySQL
  - 飞书用户绑定表
  - 消息日志
  - 卡片回调审计日志

## 6. 后端模块拆分

建议新增 4 个模块：

- `feishu-auth`
  - 飞书签名校验
  - 飞书用户到平台用户映射
- `feishu-bot`
  - 接收消息事件
  - 发送 / 更新卡片
- `feishu-commands`
  - 待我审批
  - 商机摘要
  - 解决方案摘要
  - 今日简报
- `feishu-notify`
  - 审批发起通知
  - 审批结果通知
  - 每日汇总推送

## 7. 接口清单

### 7.1 回调接口

- `POST /api/integrations/feishu/events`
- `POST /api/integrations/feishu/cards/action`

### 7.2 查询接口

- `GET /api/feishu/me/pending-approvals`
- `GET /api/feishu/opportunities/:code/summary`
- `GET /api/feishu/solutions/:code/summary`
- `GET /api/feishu/me/daily-brief`

### 7.3 审批动作接口

- `POST /api/feishu/approval/opportunity/:businessId/approve`
- `POST /api/feishu/approval/opportunity/:businessId/reject`
- `POST /api/feishu/approval/solution/:businessId/approve`
- `POST /api/feishu/approval/solution/:businessId/reject`

## 8. 最小数据表

### 8.1 `feishu_user_bindings`

- `id`
- `feishu_open_id`
- `feishu_union_id`
- `platform_user_id`
- `platform_username`
- `status`
- `created_at`
- `updated_at`

### 8.2 `feishu_message_logs`

- `id`
- `message_type`
- `receiver_type`
- `receiver_id`
- `business_type`
- `business_id`
- `payload_json`
- `send_status`
- `sent_at`

### 8.3 `feishu_callback_logs`

- `id`
- `callback_type`
- `event_id`
- `operator_open_id`
- `business_type`
- `business_id`
- `request_json`
- `result_json`
- `status`
- `created_at`

### 8.4 `feishu_card_sessions`

- `id`
- `business_type`
- `business_id`
- `message_id`
- `open_message_id`
- `card_version`
- `status`
- `updated_at`

## 9. 权限原则

- 查询权限：按平台已有权限控制。
- 审批权限：必须是当前审批节点处理人。
- OpenClaw 权限：MVP 阶段只开放只读接口。
- 所有飞书写操作都必须记录审计日志。

## 10. 飞书卡片最小字段

- 业务类型
- 编号
- 标题
- 客户
- 当前阶段
- 审批状态
- 当前节点
- 发起人
- 最近审批意见
- 操作按钮：
  - `打开平台`
  - `通过`
  - `驳回`

## 11. OpenClaw 最小能力

### 11.1 只读工具

- `get_my_pending_approvals`
- `get_opportunity_summary`
- `get_solution_summary`
- `get_daily_brief`

### 11.2 支持问题

- 我今天有哪些待审批
- 帮我看下 OPP-000010
- 总结这个商机当前问题
- 帮我整理今日待办

## 12. 2 周排期

### 第 1 周

1. 创建飞书应用并完成回调打通
2. 完成飞书用户绑定
3. 完成 `待我审批` 查询
4. 完成商机 / 解决方案摘要卡片
5. 完成审批发起 / 审批结果通知

### 第 2 周

1. 完成飞书卡片 `通过 / 驳回`
2. 完成当前节点审批人校验
3. 完成回调审计日志
4. 接入 OpenClaw 只读查询 skill
5. 完成 `今日简报`

## 13. 验收标准

- 飞书里输入 `待我审批`，3 秒内返回结果
- 查询结果与平台页面一致
- 非当前审批人不能审批
- 审批后平台状态与飞书卡片同步更新
- 审批发起和审批结果能推送到飞书
- OpenClaw 能正确回答 4 类只读问题

## 14. 风险与约束

- 用户映射不准确：MVP 先采用手工绑定或管理员绑定。
- 回调重复触发：后端必须做幂等处理。
- 审批并发冲突：以后端当前审批节点状态为唯一准入条件。
- AI 幻觉风险：OpenClaw 只读结构化接口，不自由编造业务事实。

## 15. 后续阶段规划

### 阶段 2：协同增强

- 群通知
- 每日 / 每周简报推送
- 飞书文档自动生成审批纪要
- 商机沟通摘要自动生成

### 阶段 3：文档与知识库

- 自动生成飞书文档
- 审批纪要沉淀到知识库
- OpenClaw 生成方案修改建议

### 阶段 4：日程与任务

## 16. 开发设计补充

- 为进入实际开发，本仓库已新增字段级设计与实施方案文档：[feishu-openclaw-interface-design.md](/Users/gjy/presales-platform/docs/feishu-openclaw-interface-design.md)。
- 后续接口、表结构、DTO、飞书卡片字段与 OpenClaw skill 设计，统一以该文档为实现基线；若字段调整，需先同步更新该文档与根 README。
- 当前执行口径已确认调整为“前端优先、后端接口预留”：先在平台内完成飞书集成设置、绑定管理、命令预览和卡片预览，再进入后端真实回调与飞书联调。

- 自动创建评审会 / 调研会日程
- 任务同步到飞书 Tasks
- 会后纪要回平台

### 阶段 5：群与空间

- 项目自动建群
- 自动拉项目成员
- 自动创建共享资料目录

### 阶段 6：看板与数据

- 平台到飞书 Base 单向同步
- 领导看板
- 审批漏斗
- 项目推进看板

### 阶段 7：深度 Agent 化

- 多轮业务问答
- 自动风险总结
- 自动汇报提纲
- 草稿类低风险写操作

## 16. GitLab 自动打包 / 自动同步建议

### 16.1 原则

- 不直接将整个 `/Users/gjy` 家目录纳入 Git。
- 必须先明确平台代码仓库边界，建议以当前平台根目录为唯一 Git 仓库。
- 自动推送 GitLab 不能影响当前云服务器的稳定发布流程，应先作为“代码归档 + 构建产物归档”能力上线。

### 16.2 推荐最小方案

方案 A：先建 GitLab 代码仓库，手工触发推送

- 将平台代码整理为单一 Git 仓库
- 配置 GitLab `origin`
- 本地执行：
  - `git add`
  - `git commit`
  - `git push origin <branch>`

方案 B：GitLab CI 自动打包构建

- 代码推送到 GitLab 后自动执行：
  - 前端构建
  - 后端构建
  - Docker 镜像构建
  - 生成压缩包 / 制品
- 暂不自动发布到云服务器，只生成制品，避免影响当前生产环境

### 16.3 第二阶段可做

- GitLab CI 制品自动上传到对象存储 / GitLab Package Registry
- 通过受控分支触发云服务器部署
- 保留“手工确认”闸门，防止误发布

### 16.4 当前判断

- 可以做“代码自动打包并同步到 GitLab”
- 但前提是先把当前平台代码收敛为一个明确 Git 仓库
- 在未确认仓库边界、GitLab 地址、认证方式前，不建议直接自动化上线

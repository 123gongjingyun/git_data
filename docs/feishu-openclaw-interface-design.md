# 飞书 / OpenClaw MVP 接口字段设计与开发方案

## 1. 文档定位

- 本文用于把 [feishu-openclaw-mvp-README.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/feishu-openclaw-mvp-README.md) 中的 MVP 目标收敛成可直接进入开发的接口与模块设计。
- 设计遵循当前仓库已落地的 NestJS + MySQL + TypeORM 模型，尽量复用现有 `users`、`opportunities`、`solution_versions`、`approval_instances`、`approval_instance_nodes`、`approval_actions` 能力。
- MVP 范围固定为“飞书私聊机器人 + 平台后端 + OpenClaw 只读技能”，不引入旁路主数据源。

## 2. 设计原则

- 唯一事实源：商机、方案、审批实例、审批动作仍以平台数据库为准。
- 最小侵入：飞书集成层作为 `backend/src/integrations/feishu/*` 新模块接入，不改写现有审批主链路。
- 写操作收口：飞书端的“通过 / 驳回”最终统一落到现有 `POST /approval-instances/:id/actions`。
- 身份清晰：所有飞书请求必须先从飞书用户映射到平台用户，再按平台权限执行业务动作。
- 审计完整：所有事件回调、卡片动作、消息发送都必须留痕并具备幂等字段。
- OpenClaw 只读：MVP 阶段只允许调用只读聚合接口，不允许直连写接口。

## 3. 总体架构

### 3.1 模块分层

- 飞书接入层：处理事件订阅、卡片回调、消息发送、用户身份识别。
- 平台聚合层：把商机、方案、审批实例数据整理成适合机器人返回的摘要视图。
- 审批执行层：复用现有 `ApprovalsService` 执行审批动作。
- OpenClaw skill 层：调用平台只读聚合接口完成自然语言查询。

### 3.2 建议新增后端模块

- `backend/src/integrations/feishu/feishu.module.ts`
- `backend/src/integrations/feishu/feishu.controller.ts`
- `backend/src/integrations/feishu/feishu.service.ts`
- `backend/src/integrations/feishu/feishu-signature.service.ts`
- `backend/src/integrations/feishu/feishu-binding.service.ts`
- `backend/src/integrations/feishu/feishu-card.service.ts`
- `backend/src/integrations/feishu/feishu-command.service.ts`
- `backend/src/integrations/feishu/feishu-notify.service.ts`
- `backend/src/integrations/feishu/dto/*`

### 3.3 与现有模块的依赖关系

- 读取用户：`users.service.ts` 或 `User` Repository
- 读取商机：`opportunities.service.ts` 或 `Opportunity` Repository
- 读取方案：`solution-versions.service.ts` 或 `SolutionVersion` Repository
- 读取 / 执行审批：`ApprovalsService`
- 鉴权用户载荷：`auth.service.ts` 中 `AuthUserPayload`

## 4. 核心业务对象映射

| 机器人视图对象 | 平台真实对象 | 主键 | 说明 |
| --- | --- | --- | --- |
| 飞书用户 | `users` + `feishu_user_bindings` | `platform_user_id` | 飞书侧只做身份入口，不单独存业务权限 |
| 待审批项 | `approval_instances` + `approval_instance_nodes` | `approval_instance_id` / `current_node_id` | 飞书展示的是当前可处理节点摘要 |
| 商机摘要 | `opportunities` | `opportunity.id` | 编号建议继续复用前端已有 `OPP-xxxxxx` 展示口径 |
| 方案摘要 | `solution_versions` | `solution_version.id` | 编号建议补充稳定 `SOL-xxxxxx` 展示口径 |
| 审批动作 | `approval_actions` | `approval_action.id` | 飞书卡片动作最终写入这里 |
| 卡片会话 | `feishu_card_sessions` | `id` | 用于消息更新、版本控制、幂等 |

## 5. 新增数据表设计

### 5.1 `feishu_user_bindings`

用途：维护飞书账号与平台账号一对一绑定关系。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | bigint | 是 | 主键 |
| `feishu_app_id` | varchar(64) | 是 | 预留多应用隔离 |
| `tenant_key` | varchar(64) | 否 | 飞书租户标识 |
| `feishu_open_id` | varchar(128) | 是 | 飞书用户 open_id，主查询键 |
| `feishu_union_id` | varchar(128) | 否 | 飞书用户 union_id |
| `feishu_user_id` | varchar(128) | 否 | 飞书 user_id |
| `feishu_name` | varchar(128) | 否 | 飞书侧展示名快照 |
| `platform_user_id` | int | 是 | 对应 `users.id` |
| `platform_username` | varchar(128) | 是 | 对应 `users.username` 快照 |
| `binding_source` | varchar(32) | 是 | `manual` / `import` / `self_claimed` |
| `status` | varchar(24) | 是 | `active` / `disabled` / `pending` |
| `bound_by_user_id` | int | 否 | 谁执行了绑定 |
| `bound_at` | datetime | 否 | 绑定时间 |
| `last_verified_at` | datetime | 否 | 最近一次校验飞书身份时间 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

约束建议：

- 唯一索引：`uk_feishu_open_id (feishu_app_id, feishu_open_id)`
- 唯一索引：`uk_platform_user_id (feishu_app_id, platform_user_id)`

### 5.2 `feishu_message_logs`

用途：记录所有发送到飞书的文本 / 卡片消息，便于审计与失败重试。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | bigint | 是 | 主键 |
| `message_direction` | varchar(16) | 是 | `outbound` / `inbound` |
| `message_type` | varchar(32) | 是 | `text` / `interactive` / `post` |
| `receiver_type` | varchar(32) | 是 | `open_id` / `user_id` / `chat_id` |
| `receiver_id` | varchar(128) | 是 | 接收人 |
| `event_id` | varchar(128) | 否 | 入站事件 ID |
| `request_id` | varchar(128) | 否 | 平台内部请求链路 ID |
| `business_type` | varchar(32) | 否 | `opportunity` / `solution` / `approval_instance` / `daily_brief` |
| `business_id` | bigint | 否 | 业务主键 |
| `template_key` | varchar(64) | 否 | 卡片模板或消息模板标识 |
| `payload_json` | json | 是 | 实际发送内容 |
| `response_json` | json | 否 | 飞书响应 |
| `send_status` | varchar(24) | 是 | `pending` / `sent` / `failed` |
| `error_message` | varchar(500) | 否 | 失败原因 |
| `sent_at` | datetime | 否 | 发送成功时间 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

### 5.3 `feishu_callback_logs`

用途：记录飞书事件回调和卡片动作回调，支撑幂等和追溯。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | bigint | 是 | 主键 |
| `callback_type` | varchar(32) | 是 | `event` / `card_action` |
| `event_id` | varchar(128) | 否 | 飞书事件 ID |
| `action_token` | varchar(128) | 否 | 卡片动作唯一标识 |
| `request_id` | varchar(128) | 否 | 平台内部链路 ID |
| `operator_open_id` | varchar(128) | 否 | 操作人飞书 open_id |
| `operator_platform_user_id` | int | 否 | 映射后的平台用户 ID |
| `business_type` | varchar(32) | 否 | 关联业务类型 |
| `business_id` | bigint | 否 | 关联业务 ID |
| `request_json` | json | 是 | 原始回调内容 |
| `result_json` | json | 否 | 平台处理结果 |
| `status` | varchar(24) | 是 | `received` / `processed` / `ignored` / `failed` |
| `error_message` | varchar(500) | 否 | 异常说明 |
| `processed_at` | datetime | 否 | 完成处理时间 |
| `created_at` | datetime | 是 | 创建时间 |

约束建议：

- 唯一索引：`uk_event_id (callback_type, event_id)`
- 唯一索引：`uk_action_token (callback_type, action_token)`

### 5.4 `feishu_card_sessions`

用途：保存飞书卡片消息与平台审批实例之间的对应关系，支撑消息更新。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | bigint | 是 | 主键 |
| `business_type` | varchar(32) | 是 | `approval_instance` / `opportunity` / `solution` |
| `business_id` | bigint | 是 | 业务主键 |
| `approval_instance_id` | int | 否 | 对审批卡片强关联 |
| `receiver_open_id` | varchar(128) | 是 | 收件人 |
| `message_id` | varchar(128) | 否 | 飞书消息 ID |
| `open_message_id` | varchar(128) | 否 | 飞书 open_message_id |
| `card_template_key` | varchar(64) | 是 | 模板标识 |
| `card_version` | int | 是 | 本地版本号 |
| `card_status` | varchar(24) | 是 | `active` / `acted` / `expired` / `replaced` |
| `last_action_token` | varchar(128) | 否 | 最近一次动作 token |
| `last_operator_open_id` | varchar(128) | 否 | 最近操作人 |
| `last_synced_at` | datetime | 否 | 最近同步时间 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

## 6. 平台内部聚合 DTO 设计

### 6.1 `PendingApprovalCardItem`

用于“待我审批”列表和飞书审批卡片。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `approvalInstanceId` | number | 是 | 审批实例 ID |
| `businessType` | `opportunity` \| `solution` | 是 | 业务类型 |
| `businessId` | number | 是 | 业务主键 |
| `businessCode` | string | 是 | 展示编号，如 `OPP-000010` |
| `title` | string | 是 | 商机名 / 方案名 |
| `customerName` | string | 否 | 客户名称 |
| `currentNodeId` | number | 否 | 当前节点 ID |
| `currentNodeName` | string | 否 | 当前节点名称 |
| `status` | string | 是 | 审批实例状态 |
| `stage` | string | 否 | 商机阶段或方案状态 |
| `initiatorName` | string | 否 | 发起人 |
| `canApprove` | boolean | 是 | 当前用户是否可处理 |
| `updatedAt` | string | 是 | 最近更新时间 |
| `summary` | string | 否 | 简摘要 |
| `detailUrl` | string | 否 | 平台详情链接 |

### 6.2 `OpportunityFeishuSummary`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 是 | 商机 ID |
| `code` | string | 是 | 展示编号 |
| `name` | string | 是 | 商机名称 |
| `customerName` | string | 否 | 客户名称 |
| `ownerName` | string | 否 | 销售负责人 |
| `stage` | string | 是 | 对应 `OpportunityStage` |
| `expectedValue` | string | 否 | 预计金额 |
| `probability` | number | 否 | 成交概率 |
| `expectedCloseDate` | string | 否 | 预计签约日期 |
| `approvalStatus` | string | 否 | 当前审批状态 |
| `currentApprovalNodeName` | string | 否 | 当前审批节点 |
| `solutionOwnerName` | string | 否 | 解决方案负责人 |
| `requirementBriefDocName` | string | 否 | 需求说明文档 |
| `researchDocName` | string | 否 | 调研文档 |
| `approvalOpinion` | string | 否 | 最近审批意见 |
| `riskSummary` | string[] | 否 | 风险摘要 |
| `nextActions` | string[] | 否 | 下一步建议 |
| `updatedAt` | string | 是 | 更新时间 |
| `detailUrl` | string | 否 | 平台详情链接 |

### 6.3 `SolutionFeishuSummary`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 是 | 方案 ID |
| `code` | string | 是 | 展示编号 |
| `name` | string | 是 | 方案名称 |
| `versionTag` | string | 否 | 版本号 |
| `status` | string | 是 | `draft` / `in_review` / `approved` / `rejected` / `archived` |
| `approvalStatus` | string | 否 | 审批摘要状态 |
| `opportunityId` | number | 是 | 关联商机 ID |
| `opportunityCode` | string | 是 | 关联商机编号 |
| `opportunityName` | string | 是 | 关联商机名称 |
| `customerName` | string | 否 | 客户 |
| `createdByName` | string | 否 | 创建人 |
| `currentApprovalNodeName` | string | 否 | 当前审批节点 |
| `summary` | string | 否 | 方案摘要 |
| `latestReviewConclusion` | string | 否 | 最近评审结论 |
| `updatedAt` | string | 是 | 更新时间 |
| `detailUrl` | string | 否 | 平台详情链接 |

### 6.4 `DailyBriefResponse`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | string | 是 | 日期 |
| `userId` | number | 是 | 平台用户 ID |
| `pendingApprovalCount` | number | 是 | 待审批数量 |
| `pendingApprovalTopItems` | `PendingApprovalCardItem[]` | 是 | 前 5 条 |
| `myOpportunityCount` | number | 是 | 我负责商机数 |
| `inRiskOpportunityCount` | number | 是 | 高风险商机数 |
| `updatedSolutionCount` | number | 是 | 今日更新方案数 |
| `summaryLines` | string[] | 是 | 机器人摘要语句 |
| `generatedBy` | string | 是 | `platform` / `openclaw` |

## 7. 外部接口设计

### 7.1 飞书事件接收接口

`POST /api/integrations/feishu/events`

用途：

- 接收飞书消息事件
- 接收 URL 校验 challenge
- 后续可扩展接收应用状态事件

请求体字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schema` | string | 否 | 飞书事件版本 |
| `header.event_id` | string | 否 | 事件 ID |
| `header.token` | string | 否 | 应用 token |
| `header.create_time` | string | 否 | 事件时间 |
| `event.sender.sender_id.open_id` | string | 否 | 发消息用户 |
| `event.message.message_id` | string | 否 | 消息 ID |
| `event.message.chat_type` | string | 否 | 本期只接受 `p2p` |
| `event.message.message_type` | string | 否 | 文本消息 |
| `event.message.content` | string | 否 | 消息正文 JSON |
| `challenge` | string | 否 | URL 校验字段 |

响应体字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `challenge` | string | 否 | URL 校验时原样返回 |
| `code` | number | 是 | 0 表示成功 |
| `message` | string | 是 | 处理说明 |
| `requestId` | string | 否 | 链路 ID |

### 7.2 飞书卡片动作回调接口

`POST /api/integrations/feishu/cards/action`

请求体核心字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `open_id` | string | 否 | 操作人 open_id |
| `open_message_id` | string | 否 | 卡片消息 ID |
| `token` | string | 否 | 卡片 token |
| `action.value.action` | string | 是 | `approve` / `reject` / `open_detail` |
| `action.value.approvalInstanceId` | number | 否 | 审批实例 ID |
| `action.value.businessType` | string | 否 | 业务类型 |
| `action.value.businessId` | number | 否 | 业务主键 |
| `action.value.commentRequired` | boolean | 否 | 是否要求意见 |
| `action.value.cardSessionId` | number | 否 | 本地卡片会话 |

平台内部统一转换为：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `operatorOpenId` | string | 是 | 飞书操作者 |
| `platformUserId` | number | 是 | 绑定后的平台用户 |
| `approvalInstanceId` | number | 是 | 审批实例 |
| `actionType` | string | 是 | `approve` / `reject` |
| `comment` | string | 否 | 审批意见 |
| `actionToken` | string | 否 | 幂等键 |

响应体字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `toast.type` | string | 否 | `success` / `error` / `warning` |
| `toast.content` | string | 否 | 飞书侧提示 |
| `card` | object | 否 | 刷新的新卡片 |

### 7.3 飞书聚合查询接口

这些接口既可供机器人命令调用，也可供 OpenClaw 只读 skill 调用。

#### `GET /api/integrations/feishu/me/pending-approvals`

查询参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `limit` | number | 否 | 默认 10，最大 20 |
| `businessType` | string | 否 | `opportunity` / `solution` |

响应体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `items` | `PendingApprovalCardItem[]` | 是 | 待审批列表 |
| `total` | number | 是 | 总数 |
| `requestId` | string | 否 | 链路 ID |

#### `GET /api/integrations/feishu/opportunities/:code/summary`

路径参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | string | 是 | `OPP-000010` |

响应体：`OpportunityFeishuSummary`

#### `GET /api/integrations/feishu/solutions/:code/summary`

路径参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | string | 是 | `SOL-000123` |

响应体：`SolutionFeishuSummary`

#### `GET /api/integrations/feishu/me/daily-brief`

响应体：`DailyBriefResponse`

### 7.4 飞书绑定管理接口

这些接口面向平台管理后台，MVP 阶段建议先做最小管理能力，不在飞书端暴露自助绑定。

#### `GET /api/integrations/feishu/bindings`

响应字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `items[].id` | number | 是 | 绑定记录 ID |
| `items[].feishuOpenId` | string | 是 | 飞书 open_id |
| `items[].feishuName` | string | 否 | 飞书用户名 |
| `items[].platformUserId` | number | 是 | 平台用户 ID |
| `items[].platformUsername` | string | 是 | 平台用户名 |
| `items[].status` | string | 是 | 绑定状态 |
| `items[].updatedAt` | string | 是 | 更新时间 |

#### `POST /api/integrations/feishu/bindings`

请求字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `feishuOpenId` | string | 是 | 飞书用户 open_id |
| `feishuUnionId` | string | 否 | union_id |
| `feishuUserId` | string | 否 | user_id |
| `feishuName` | string | 否 | 飞书展示名 |
| `platformUserId` | number | 是 | 平台用户 ID |
| `status` | string | 否 | 默认 `active` |

#### `PATCH /api/integrations/feishu/bindings/:id`

请求字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `platformUserId` | number | 否 | 变更绑定对象 |
| `status` | string | 否 | `active` / `disabled` |

## 8. OpenClaw Skill 接口约定

MVP 阶段不让 OpenClaw 直接调飞书开放平台，而是只调平台后端的只读聚合接口。

### 8.1 Skill 列表

| Skill 名称 | 调用接口 | 说明 |
| --- | --- | --- |
| `get_my_pending_approvals` | `GET /api/integrations/feishu/me/pending-approvals` | 返回待审批结构化列表 |
| `get_opportunity_summary` | `GET /api/integrations/feishu/opportunities/:code/summary` | 返回商机摘要 |
| `get_solution_summary` | `GET /api/integrations/feishu/solutions/:code/summary` | 返回方案摘要 |
| `get_daily_brief` | `GET /api/integrations/feishu/me/daily-brief` | 返回今日简报 |

当前仓库内已落地一层 OpenClaw 后端只读封装：

| OpenClaw 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/integrations/openclaw/skills` | `GET` | 列出当前可用的 4 个只读 skill |
| `/api/integrations/openclaw/skills/:name` | `POST` | 按 skill 名执行结构化查询 |
| `/api/integrations/openclaw/query` | `POST` | 将自然语言映射到上述只读 skill |

请求头约束：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `x-openclaw-token` | string | 是 | 服务端共享令牌，需与 `OPENCLAW_SHARED_TOKEN` / `BACKEND_OPENCLAW_SHARED_TOKEN` 一致 |

### 8.2 OpenClaw 请求上下文

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `platformUserId` | number | 是 | 当前登录平台用户 |
| `feishuOpenId` | string | 否 | 若来自飞书对话则带上 |
| `queryText` | string | 是 | 原始自然语言输入 |
| `requestId` | string | 否 | 请求链路 ID |

### 8.3 OpenClaw 响应约束

- 必须引用结构化接口返回的真实字段，不自行捏造业务事实。
- 若接口未查到目标编号，回复“未找到对应商机/方案”。
- 若用户没有权限，回复权限不足，不尝试绕过。
- 如需生成自然语言摘要，只能基于接口返回内容做压缩与改写。

## 9. 飞书卡片字段设计

### 9.1 待审批卡片字段

| 区块 | 字段 | 说明 |
| --- | --- | --- |
| 标题区 | `title` | `待审批：${businessCode} ${title}` |
| 基础信息 | `businessTypeLabel` | 商机 / 解决方案 |
| 基础信息 | `customerName` | 客户 |
| 基础信息 | `stageLabel` | 当前阶段 |
| 审批信息 | `statusLabel` | 审批状态 |
| 审批信息 | `currentNodeName` | 当前节点 |
| 审批信息 | `initiatorName` | 发起人 |
| 审批信息 | `updatedAtLabel` | 最近更新时间 |
| 摘要区 | `summary` | 最多 2 到 3 行 |
| 操作区 | `open_detail` | 打开平台详情 |
| 操作区 | `approve` | 通过 |
| 操作区 | `reject` | 驳回 |

### 9.2 动作值载荷

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `action` | string | 是 | `approve` / `reject` / `open_detail` |
| `approvalInstanceId` | number | 否 | 审批实例 |
| `businessType` | string | 是 | 业务类型 |
| `businessId` | number | 是 | 业务主键 |
| `businessCode` | string | 是 | 展示编号 |
| `cardSessionId` | number | 否 | 本地卡片会话 |
| `requestId` | string | 否 | 前后端链路跟踪 |

## 10. 审批写接口复用策略

飞书审批不建议新做一套 `/approve`、`/reject` 分散接口，而应在集成层做一次“动作翻译”，再调用现有审批主接口。

推荐内部执行方式：

1. 飞书卡片回调进入 `POST /api/integrations/feishu/cards/action`
2. 解析 `approvalInstanceId`
3. 根据 `operatorOpenId` 找到 `platformUserId`
4. 调用现有 `approvalsService.executeAction(approvalInstanceId, { actionType, comment }, actor)`
5. 将返回的最新审批实例重新渲染成卡片
6. 更新 `feishu_card_sessions` 与 `feishu_callback_logs`

这样可以避免：

- 飞书审批绕过现有审批权限
- 平台和飞书出现两套审批状态机
- 审批审计日志分裂

## 11. 状态机与幂等要求

### 11.1 消息命令幂等

- 以 `event_id` 去重，重复消息事件只处理一次。
- 对“待我审批”“今日简报”查询类命令可以重复返回，但同一个事件只记一条回调日志。

### 11.2 卡片动作幂等

- 以 `action_token` 或 `open_message_id + action + operator_open_id + minute_bucket` 做幂等保护。
- 若审批实例已不在可处理状态，应返回“当前卡片已失效，请重新打开最新卡片”。

### 11.3 业务并发控制

- 平台后端仍以 `approval_instances.currentNodeId` 和节点状态作为唯一准入条件。
- 若飞书两次重复点击“通过”，第二次必须被识别为已处理或无效动作。

## 12. 错误码建议

| 代码 | 场景 | 说明 |
| --- | --- | --- |
| `FEISHU_BINDING_NOT_FOUND` | 用户未绑定 | 飞书用户未映射到平台账号 |
| `FEISHU_SIGNATURE_INVALID` | 签名错误 | 回调验签失败 |
| `FEISHU_UNSUPPORTED_CHAT_TYPE` | 非私聊消息 | MVP 只处理私聊 |
| `APPROVAL_NOT_ACTIONABLE` | 不可审批 | 当前节点不可由该用户处理 |
| `BUSINESS_NOT_FOUND` | 业务不存在 | 商机/方案不存在 |
| `CARD_SESSION_EXPIRED` | 卡片过期 | 需重新拉取 |
| `OPENCLAW_READONLY_ONLY` | 禁止写操作 | OpenClaw 不允许触发写操作 |

## 13. 开发进入方案

### 13.0 当前执行策略

- 先按“前端优先、后端接口预留”推进，而不是一开始就打通真实飞书与 OpenClaw。
- 当前阶段前端先完成平台内的“飞书集成”配置页、绑定管理页、命令口径预览和卡片预览。
- 后端当前阶段只需保证接口契约稳定，不急于接入真实飞书回调、消息发送和审批写链路。
- 前端使用独立 Mock service 驱动，字段命名必须严格对齐本文档，避免后续接入真实接口时再次重构页面状态。

### 13.1 第 0 阶段：准备

- 补全 `.env.example` 中飞书与 OpenClaw 相关环境变量。
- 明确飞书自建应用配置项：
  - `FEISHU_APP_ID`
  - `FEISHU_APP_SECRET`
  - `FEISHU_VERIFICATION_TOKEN`
  - `FEISHU_ENCRYPT_KEY`
  - `FEISHU_BOT_NAME`
  - `FEISHU_BASE_URL`
- 明确 OpenClaw 服务端共享配置：
  - `OPENCLAW_SHARED_TOKEN`
- 明确平台外链前缀：
  - `PLATFORM_WEB_BASE_URL`
  - `PLATFORM_API_BASE_URL`

### 13.2 第 1 阶段：后端骨架

- 新增 `integrations/feishu` 模块和基础 controller/service。
- 新建 4 张表对应实体与 migration。
- 做 URL challenge 校验接口和签名校验工具。
- 完成管理员侧绑定接口。
- 若前端联调仍以 Mock 为主，本阶段允许先只补 DTO、控制器签名和稳定的空返回 / 示例返回。

当前已落地的最小骨架：

- 已新增 `backend/src/integrations/feishu/feishu.module.ts`
- 已新增 `backend/src/integrations/feishu/feishu.controller.ts`
- 已新增 `backend/src/integrations/feishu/feishu.service.ts`
- 已预留 `bindings` 管理接口、`me/*` 只读聚合接口，以及 `events` / `cards/action` 回调占位接口

交付标准：

- 能落库绑定关系
- 能记录原始事件日志
- 飞书事件地址可通过平台回调校验

### 13.3 第 2 阶段：只读查询链路

- 实现 `待我审批` 聚合查询
- 实现商机摘要接口
- 实现方案摘要接口
- 实现飞书文本命令解析
- 实现飞书卡片渲染与发送

交付标准：

- 飞书私聊发送 `待我审批`
- 3 秒内返回结构化卡片
- 商机 / 方案摘要与平台页面口径一致

### 13.4 第 3 阶段：审批闭环

- 实现卡片回调解析
- 映射成现有 `ApprovalsService.executeAction`
- 补充卡片过期校验、节点责任人校验、重复点击幂等
- 审批后刷新卡片状态并推送结果消息

交付标准：

- 当前节点审批人可在飞书端完成通过 / 驳回
- 非当前节点审批人被拒绝
- 平台审批动作日志完整落库

### 13.5 第 4 阶段：OpenClaw 只读接入

- 将 4 个聚合接口封装为 OpenClaw skill
- 加一层用户上下文注入与权限继承
- 补充自然语言意图到结构化接口的映射

当前已落地的最小实现：

- 已新增 `backend/src/integrations/openclaw/openclaw.module.ts`
- 已新增 `backend/src/integrations/openclaw/openclaw.controller.ts`
- 已新增 `backend/src/integrations/openclaw/openclaw.service.ts`
- 已新增 `GET /api/integrations/openclaw/skills`
- 已新增 `POST /api/integrations/openclaw/skills/:name`
- 已新增 `POST /api/integrations/openclaw/query`
- 已实现 `platformUserId / feishuOpenId` 上下文解析与绑定一致性校验
- 已实现写意图拦截，命中审批/修改/删除等动词时直接返回 `OPENCLAW_READONLY_ONLY`

交付标准：

- OpenClaw 能正确回答待审批、商机摘要、方案摘要、今日简报
- 不能触发任何写操作

## 14. 建议开发拆分

### 14.1 后端任务拆分

| 任务 | 负责人建议 | 依赖 |
| --- | --- | --- |
| 飞书配置与签名校验 | 后端 | 无 |
| 绑定表与管理接口 | 后端 | 用户模块 |
| 消息事件解析 | 后端 | 签名校验 |
| 审批聚合查询 DTO | 后端 | 审批模块 |
| 商机 / 方案摘要聚合 | 后端 | 商机/方案模块 |
| 卡片消息发送与更新 | 后端 | 飞书 client |
| 卡片审批回调 | 后端 | 审批模块 |
| OpenClaw skill 封装 | 集成/后端 | 聚合查询接口 |

### 14.2 前端 / 平台任务拆分

| 任务 | 负责人建议 | 说明 |
| --- | --- | --- |
| 飞书绑定管理页 | 前端 | 放入系统设置，管理员可维护 |
| 业务详情外链参数对齐 | 前端 | 支持从飞书打开商机 / 方案详情 |
| 审批详情页链接稳定化 | 前端 | 链接参数需可直接落位到目标记录 |

## 15. 测试方案

### 15.1 单元测试

- 飞书签名校验
- 消息命令解析
- 飞书用户绑定解析
- 卡片动作到审批输入的映射
- 幂等逻辑

### 15.2 集成测试

- 飞书事件 challenge 校验
- `待我审批` 查询链路
- 商机摘要查询链路
- 方案摘要查询链路
- 卡片审批通过 / 驳回链路
- 非法用户、未绑定用户、非当前审批人场景

### 15.3 联调验收脚本

- `manager_demo` 绑定飞书账号后发送 `待我审批`
- 选择一个待审批商机点击 `通过`
- 平台页面复核实例状态与动作日志
- 同一动作重复点击，确认不会重复审批
- OpenClaw 提问“我今天有哪些待审批”，核对结果一致

## 16. MVP 验收口径

- 飞书私聊命令只支持白名单命令，不做开放式聊天。
- 飞书卡片审批只支持当前审批节点的 `approve` / `reject`，不扩展上传文件、指派负责人等复杂节点动作。
- OpenClaw 只做只读摘要，不接写操作，也不接自由表单式流程操作。
- 若某审批节点属于复杂动作节点，例如上传文档或指派负责人，飞书卡片仅展示“请前往平台处理”，不提供按钮。

## 17. 明确不进入 MVP 的能力

- 飞书群聊审批
- 飞书 Base 数据回写
- 飞书云文档正文生成与反写
- 自动拉群、自动建日程
- OpenClaw 直接审批
- 多租户飞书应用隔离

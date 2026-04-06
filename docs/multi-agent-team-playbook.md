# 售前流程全生命周期管理系统多 Agent 并行作战手册

## 1. 目的

本手册用于统一本项目在复杂任务下的多 Agent 并行协作方式，目标是：

- 提升前后端并行开发速度；
- 降低多人 / 多 Agent 同时修改公共层导致的冲突与返工；
- 固化主 Agent、子 Agent、测试验证之间的职责边界；
- 为后续会话提供可直接复用的拆单、派单、汇总与收口规范。

本手册适用于中等及以上复杂度任务，尤其是以下场景：

- 一个需求可拆为多个前端页面或模块；
- 一个需求同时涉及前端、后端与测试验证；
- 一个需求虽有公共层依赖，但可先冻结契约再并行开发。

以下场景不建议强行多 Agent 并行：

- 改动只集中在单个公共入口文件；
- 接口字段、权限 key、状态枚举仍未确定；
- 当前主要工作是排查单点线上 bug；
- 回归测试护栏明显不足，短期内返工风险高于并行收益。

## 2. 总体协作模型

本项目默认采用：

- `1 个主 agent + 5 个子 agent`

核心原则如下：

- 主 agent 统一指挥、拆单、裁决、汇总、收口。
- 子 agent 仅在明确写入边界内执行，不跨边界“顺手修改”。
- 通信默认通过主 agent 中转，不采用网状自由协作。
- 合并顺序固定为“先冻结契约，再并行实现，最后主 agent 收口并验证”。
- 发布顺序默认遵循“本地优先验证，通过后再同步云上环境”，并保持本地与云上执行口径一致。
- 当天若存在大版本功能变动或高风险上线改动，需优先同步 GitHub，形成远端检查点，再继续推进后续联调或上线动作。

推荐信息流如下：

```text
用户 -> 主 agent

主 agent -> 子 agent A / B / C / D / E
子 agent -> 主 agent
主 agent -> 用户
```

如果某个子 agent 依赖另一个子 agent 的信息，默认采用：

```text
子 agent A -> 主 agent：提出阻塞问题
主 agent -> 子 agent B：要求提供统一说明
子 agent B -> 主 agent：返回结果
主 agent -> 子 agent A：回传统一口径
```

## 3. 角色与职责

### 3.1 主 Agent

主 agent 负责：

- 阅读并澄清本轮需求；
- 判断本轮任务是否适合并行；
- 冻结本轮契约；
- 拆分子任务并派单；
- 监控子 agent 进度与阻塞；
- 控制公共层改动；
- 汇总子 agent 结果并完成最终接线；
- 运行相关验证；
- 向用户输出统一结论。

主 agent 独占修改权的区域如下：

- 前端公共入口：
  - `frontend/src/App.tsx`
- 前端共享协议层：
  - `frontend/src/shared/api.ts`
  - `frontend/src/shared/auth.ts`
  - `frontend/src/shared/opportunityDemoData.ts`
  - 其他涉及全局协议、全局存储 key、全局事件名的共享文件
- 后端公共入口：
  - `backend/src/app.module.ts`
  - `backend/src/main.ts`
- 后端运行配置：
  - `backend/src/config/runtime.ts`
- 后端领域实体：
  - `backend/src/domain/entities/*`
- 后端权限总口径：
  - `backend/src/users/user-access.ts`

### 3.2 子 Agent

子 agent 负责：

- 在分配的页面、模块或目录边界内完成实现；
- 遵循主 agent 冻结的契约，不擅自修改公共协议；
- 在阻塞时主动回报主 agent；
- 完成后提交变更文件、风险说明与需要主 agent 接线的点。

子 agent 默认不负责：

- 修改全局协议；
- 修改公共入口装配；
- 最终合并；
- 最终全链路验证；
- 对外结论统一输出。

## 4. 本项目推荐编排

### 4.1 推荐固定 Team 结构

建议默认使用以下编排：

1. 主 agent：总控与收口
2. 子 agent A：前端页面线 1
3. 子 agent B：前端页面线 2
4. 子 agent C：前端系统设置线
5. 子 agent D：后端认证与用户线
6. 子 agent E：后端流程审批线

### 4.2 前端推荐分工

子 agent A 建议负责：

- `frontend/src/views/WorkbenchView.tsx`
- `frontend/src/views/AnalyticsView.tsx`

子 agent B 建议负责：

- `frontend/src/views/ProjectsView.tsx`
- `frontend/src/views/OpportunitiesView.tsx`
- `frontend/src/views/SolutionsView.tsx`

说明：

- 上述页面应按本轮实际需求择一或择二分配，但应保持“一个 agent 独占一个页面文件”的原则。
- 不建议将同一个大页面拆给多个 agent 同时修改。

子 agent C 建议独占：

- `frontend/src/views/SettingsView.tsx`

原因：

- 该页面承担团队管理、菜单权限、操作权限、流程库等高耦合内容；
- 该文件通常体量最大，最容易形成串行瓶颈；
- 默认不应与其他前端任务混派。

### 4.3 后端推荐分工

子 agent D 建议负责：

- `backend/src/auth/*`
- `backend/src/users/*`

原因：

- 认证、用户、当前用户信息、权限返回结构天然耦合；
- 与其拆散后再协调，不如放在同一条线内完成。

子 agent E 建议负责：

- `backend/src/workflows/*`
- `backend/src/approvals/*`

原因：

- 流程定义与审批执行强相关；
- 若审批状态、节点动作、回写规则未冻结，拆成两个 agent 冲突概率较高。

如后续任务进一步增大，可再扩展为：

- 子 agent E1：`backend/src/workflows/*`
- 子 agent E2：`backend/src/approvals/*`

前提是主 agent 先冻结：

- 审批状态枚举；
- 节点动作语义；
- 与商机 / 解决方案的状态回写规则。

## 5. 并行边界规则

以下规则是本手册的核心约束：

1. 一个子 agent 只拥有一个明确写入边界。
2. 公共层默认仅允许主 agent 修改。
3. 子 agent 之间默认不直接协商公共契约。
4. 一轮并行开始前必须先冻结契约。
5. 合并顺序固定，不采用自由合并。

### 5.1 前端边界

前端子 agent 的安全写入边界优先级如下：

1. 单个页面文件：
   - 例如 `frontend/src/views/ProjectsView.tsx`
2. 单个共享模块族：
   - 例如 `frontend/src/shared/pipelineMock.ts` + `frontend/src/shared/realOpportunities.ts`
3. 页面新增的局部组件文件：
   - 例如与单页面强绑定的新建组件

前端默认禁止子 agent 直接修改：

- `frontend/src/App.tsx`
- `frontend/src/shared/api.ts`
- `frontend/src/shared/auth.ts`
- `frontend/src/shared/opportunityDemoData.ts`
- 其他本轮未授权的全局共享层

### 5.2 后端边界

后端子 agent 的安全写入边界优先级如下：

1. 单个模块目录：
   - 例如 `backend/src/auth/*`
2. 单个业务子系统：
   - 例如 `backend/src/workflows/*`
3. 模块内部新增的私有 helper / DTO / service / test 文件

后端默认禁止子 agent 直接修改：

- `backend/src/app.module.ts`
- `backend/src/main.ts`
- `backend/src/config/runtime.ts`
- `backend/src/domain/entities/*`
- `backend/src/users/user-access.ts`

## 6. 契约冻结清单

每轮并行前，主 agent 至少要冻结以下内容：

- 接口路径与 HTTP 方法；
- 请求 DTO 字段；
- 响应结构；
- 权限 key；
- 状态枚举；
- 关键事件名；
- 本地存储 key；
- 与共享商机 / 审批 / 用户信息相关的字段命名。

如果以上内容仍不稳定，建议先由主 agent 或单 agent 完成设计收口，再开启并行。

## 7. 派单模板

后续每次派单时，建议使用以下固定模板：

```text
任务名称：
目标：
责任边界：
可修改文件：
禁止修改文件：
输入契约：
预期输出：
完成标准：
阻塞时反馈对象：主 agent
```

### 7.1 前端页面任务单示例

```text
任务名称：项目列表列设置优化
目标：完成项目管理页的列显隐、列宽和本地记忆优化
责任边界：只负责 Projects 页面
可修改文件：
- /Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/ProjectsView.tsx
- 该页面新增的局部组件文件
禁止修改文件：
- /Users/gjy/Projects-mygetpre/presales-platform/frontend/src/App.tsx
- /Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/*
- 其他 views 页面
输入契约：
- 使用现有项目数据结构
- 不修改全局筛选参数命名
预期输出：
- 页面功能完成
- 给出受影响文件和需要主 agent 接线的点
完成标准：
- 页面可运行
- 功能行为正确
- 无跨边界改动
阻塞时反馈对象：主 agent
```

### 7.2 后端模块任务单示例

```text
任务名称：审批实例执行接口完善
目标：完善审批通过/驳回/上传/指派接口及服务逻辑
责任边界：只负责 approvals 模块
可修改文件：
- /Users/gjy/Projects-mygetpre/presales-platform/backend/src/approvals/*
禁止修改文件：
- /Users/gjy/Projects-mygetpre/presales-platform/backend/src/domain/entities/*
- /Users/gjy/Projects-mygetpre/presales-platform/backend/src/app.module.ts
- /Users/gjy/Projects-mygetpre/presales-platform/backend/src/config/runtime.ts
- /Users/gjy/Projects-mygetpre/presales-platform/backend/src/users/user-access.ts
输入契约：
- 使用主 agent 冻结的审批状态枚举
- 使用已确定的业务回写规则
预期输出：
- controller/service 完整实现
- 说明依赖的 entity 字段或回写钩子
完成标准：
- 模块内部逻辑闭环
- 不跨边界修改公共层
阻塞时反馈对象：主 agent
```

## 8. 进度同步模板

每个子 agent 应以最小但足够的信息量向主 agent 汇报：

```text
任务：
状态：未开始 / 进行中 / 已完成 / 阻塞
已完成：
阻塞点：
变更文件：
```

建议汇报节奏：

- 接单后：确认已理解边界；
- 实现中：如有阻塞立即上报；
- 完成后：提交变更文件、风险说明、待主 agent 接线项。

主 agent 重点关注：

- 是否阻塞；
- 是否越界；
- 是否可合并；
- 是否需要补测试。

## 9. 合并与验证顺序

推荐固定顺序如下：

1. 主 agent 明确本轮范围与契约；
2. 子 agent 并行在私有边界内开发；
3. 主 agent 汇总子 agent 输出；
4. 主 agent 修改公共层并完成接线；
5. 主 agent 在本地运行最小相关测试；
6. 主 agent 视情况在本地运行更完整回归；
7. 本地验证通过后，再同步云上环境并做必要联调；
8. 若当天属于大版本功能变动或高风险上线窗口，应在关键节点同步 GitHub，保留远端检查点；
9. 主 agent 向用户汇报统一结果；
10. 若任务已完成，更新 `README.md` 中的状态记录。

## 10. 什么时候扩容或缩容

建议使用以下经验规则：

- 复杂任务默认 `1 主 + 3~5 子`；
- 若本轮主要集中在单个公共层文件，不要扩容；
- 若多个页面 / 模块可独立推进，可扩容；
- 若测试覆盖薄弱且公共层变更大，先缩容，优先补测试；
- 子 agent 数量并非越多越快，应以“主 agent 可有效协调”为上限。

## 11. 本项目当前判断

结合当前代码结构，以下判断已成立：

- 前端适合并行，但必须采用“页面独占 + 共享层单写者”模式；
- 后端适合并行，但必须采用“模块独占 + 实体/公共配置单写者”模式；
- `frontend/src/views/SettingsView.tsx`、`frontend/src/App.tsx`、`frontend/src/shared/opportunityDemoData.ts` 是前端主要串行瓶颈；
- `backend/src/app.module.ts`、`backend/src/config/runtime.ts`、`backend/src/domain/entities/*`、`backend/src/approvals/approvals.service.ts` 是后端主要串行瓶颈；
- 本项目当前最推荐的实践是“主 agent 掌控公共层，子 agent 按页面或模块目录并行执行”。

## 12. 使用方式

后续新会话在进入复杂任务前，建议按以下顺序执行：

1. 阅读 `README.md`；
2. 阅读本手册；
3. 判断本轮任务是否适合并行；
4. 若适合，则由主 agent 冻结契约并派单；
5. 先在本地完成最小可验证闭环，再决定是否同步云上；
6. 若当天属于大版本或高风险变更，先同步 GitHub 再继续推进；
7. 若不适合并行，则采用单 agent 直接推进。

本手册为当前项目默认协作规范；若后续项目结构或工作方式明显变化，应及时更新本文件与 `README.md` 中的协作约定。

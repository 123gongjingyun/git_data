# Mock 数据总表

本文档用于统一维护当前前端使用的 Mock 数据、派生规则、本地存储键以及后续维护约束。

适用范围：
- 项目管理
- 商机管理
- 解决方案
- 投标管理
- 合同管理
- 知识库
- 系统设置中的团队与流程库默认数据

维护原则：
- 后续凡是新增、修改、删除 Mock 数据，必须同步更新本文档。
- 先更新实际代码中的 Mock 数据，再更新本文档中的“数据说明 / 当前样例 / 派生规则 / 存储键”。
- 若某个页面的数据不是独立维护，而是由共享商机数据派生，优先修改共享源数据，并在本文档中记录派生影响范围。

## 0. 飞书集成原型数据

代码来源：
- [feishuIntegrationMock.ts](/Users/gjy/presales-platform/frontend/src/shared/feishuIntegrationMock.ts)
- [FeishuIntegrationView.tsx](/Users/gjy/presales-platform/frontend/src/views/FeishuIntegrationView.tsx)

用途：
- 作为“系统设置 > 飞书集成”页面的前端原型数据源。
- 当前仅用于预演飞书绑定管理、机器人命令口径和卡片字段，不调用真实后端。

本地存储：
- `feishuIntegrationMockState`

字段与样例说明：
- `bindings`: 飞书绑定记录列表，包含 `feishuOpenId / feishuName / platformUserId / platformUsername / department / bindingSource / status / updatedAt`
- `commands`: 机器人命令预览，包含 `command / description / targetEndpoint / responseType`
- `cards`: 飞书卡片预览，包含 `templateKey / title / subtitle / summaryLines / fields / actions`

维护约束：
- 这里的 Mock 字段必须对齐 [feishu-openclaw-interface-design.md](/Users/gjy/presales-platform/docs/feishu-openclaw-interface-design.md) 中的绑定、命令和卡片设计，不允许前端自行另起字段名。
- 若后续真实接口字段有调整，必须同时更新此处 Mock 数据、原型页展示和接口设计文档。

## 1. 核心共享商机数据

代码来源：
- [opportunityDemoData.ts](/Users/gjy/frontend/src/shared/opportunityDemoData.ts)

用途：
- 这是当前系统最核心的共享 Mock 数据源。
- 项目管理、商机管理、解决方案、投标管理、合同管理、工作台、数据分析、知识库等多个页面都会直接或间接使用它。

本地存储：
- `sharedDemoOpportunities`

事件广播：
- `sharedDemoOpportunitiesUpdated`

字段说明：
- `id`: 商机唯一标识
- `opportunityCode`: 商机编号
- `name`: 商机名称
- `customerName`: 客户名称
- `stage`: 阶段，统一使用 `discovery / solution_design / proposal / bidding / negotiation / won / lost`
- `approvalStatus`: 审批状态，`approved / pending / rejected`
- `techApprovalStatus`: 技术审批状态
- `bizApprovalStatus`: 商务审批状态
- `approvalOpinion`: 审批意见
- `requirementBriefDocName`: 客户需求说明文档
- `researchDocName`: 调研文档
- `solutionOwnerUsername`: 解决方案负责人账号
- `expectedValue`: 预期金额
- `probability`: 成交概率
- `weightedValue`: 加权金额
- `expectedCloseDate`: 预计关闭 / 签约时间
- `createdAt`: 创建时间
- `ownerUsername`: 销售负责人账号
- `projectName`: 商机所属项目名称；若已有显式绑定，则优先使用该值作为项目主线名称
- `projectKey`: 商机所属项目主线唯一键；项目管理聚合、项目详情关联商机查询均以该字段为准

当前默认样例：

| ID | 商机编号 | 商机名称 | 客户 | 阶段 | 审批状态 | 预期金额 | 成交概率 | 预计关闭 |
|---|---|---|---|---|---|---:|---:|---|
| 1 | OPP-000001 | 【示例】某银行数字化转型项目 | 某某银行 | discovery | pending | ¥5,000,000.00 | 40% | 2026-06-30 |
| 2 | OPP-000002 | 【示例】总部统一安全接入方案 | 某集团总部 | solution_design | approved | ¥2,000,000.00 | 60% | 2026-07-15 |
| 3 | OPP-000003 | 【示例】工业互联网平台升级项目 | 示例制造企业 | proposal | pending | ¥8,000,000.00 | 55% | 2026-08-20 |
| 4 | OPP-000004 | 【示例】智慧园区一期建设项目 | 某地产园区 | negotiation | rejected | ¥10,000,000.00 | 65% | 2026-09-30 |
| 5 | OPP-000005 | 【示例】区域医疗云平台建设项目 | 某市卫健委 | won | approved | ¥12,000,000.00 | 100% | 2026-03-18 |
| 6 | OPP-000006 | 【示例】连锁零售数据中台项目 | 某全国零售集团 | negotiation | approved | ¥6,500,000.00 | 75% | 2026-11-05 |
| 7 | OPP-000007 | 【示例】能源集团视频融合平台项目 | 某省能源集团 | proposal | pending | ¥4,800,000.00 | 50% | 2026-12-12 |
| 8 | OPP-000008 | 【示例】省级教育云资源平台项目 | 某省教育厅 | won | approved | ¥9,800,000.00 | 100% | 2026-03-20 |
| 9 | OPP-000009 | 【示例】城市轨交运维协同平台项目 | 某城市轨交集团 | negotiation | approved | ¥7,200,000.00 | 82% | 2027-01-15 |

补充说明：
- 页面运行时优先读取 `localStorage.sharedDemoOpportunities`。
- 如果本地已有自定义或编辑后的商机数据，系统会用本地数据覆盖默认样例，同时自动补齐代码中新增加的默认样例记录。
- 系统会在加载/保存共享商机数据时自动补齐 `projectName / projectKey`，确保旧版本地存量数据也能平滑迁移到当前的显式项目绑定口径。

## 2. 销售与售前人员映射

代码来源：
- [opportunityDemoData.ts](/Users/gjy/frontend/src/shared/opportunityDemoData.ts)

用途：
- 为共享商机、项目管理、解决方案、投标管理、合同管理等页面提供负责人中文展示名。

当前样例：

| username | 展示名 |
|---|---|
| `zhangsan_sales` | 张三（金融行业负责人） |
| `lisi_sales` | 李四（制造行业销售） |
| `wangwu_sales` | 王五（电商行业负责人） |
| `zhaoliu_sales` | 赵六（园区行业负责人） |
| `presales_demo` | 示例售前（presales_demo） |
| `other_user` | 其他售前（other_user） |

## 3. 共享派生数据规则

代码来源：
- [pipelineMock.ts](/Users/gjy/frontend/src/shared/pipelineMock.ts)
- [projectNaming.ts](/Users/gjy/frontend/src/shared/projectNaming.ts)

说明：
- 下列页面的数据并不是独立维护，而是由“核心共享商机数据”派生得到。
- 如果要修改这些页面的 Mock 数据口径，优先改共享商机数据和派生规则，不建议单独在页面里写死第二套数据。

### 3.1 项目管理派生规则

代码来源：
- [ProjectsView.tsx](/Users/gjy/frontend/src/views/ProjectsView.tsx)

派生规则：
- 项目列表按 `projectKey` 聚合，同一项目主线下的多条商机会合并为一条项目记录，不再按“每条商机各生成一个项目行”展示
- 项目名称优先取商机上的显式 `projectName`；若未提供，再按商机名称派生：去掉前缀 `【示例】`，若末尾不是“项目”则自动补“项目”
- `projectKey` 优先取商机显式字段；若旧数据未携带，则按项目名称归一化后生成稳定键值
- 项目详情中的“关联商机列表”按同一 `projectKey` 查询，不再按 `customerName` 自动混合同客户下的其他项目商机
- 项目预算为同一 `projectKey` 下全部关联商机 `expectedValue` 的汇总结果
- `stage === won` 对应项目状态 `completed`
- `stage === lost` 对应项目状态 `archived`
- 其他阶段对应项目状态 `inprogress`
- 若同一项目下存在多条商机，则项目阶段、预计签约时间、成交概率等摘要信息按项目主线聚合结果实时刷新
- 优先级根据成交概率派生：
  - `>= 70`: 高
  - `>= 40`: 中
  - `< 40`: 低
- 已完成项目不允许继续新增关联商机；从项目详情创建的关联商机会自动继承当前项目的 `projectKey / projectName` 并同步回商机管理。

### 3.2 解决方案列表派生规则

代码来源：
- [pipelineMock.ts](/Users/gjy/frontend/src/shared/pipelineMock.ts)

派生规则：
- 每条共享商机生成一条解决方案记录
- 方案名称：`${项目名称}解决方案`
- 版本：`v{id}.0`
- 类型：
  - `bidding` 阶段显示为“投标方案”
  - 其他阶段显示为“解决方案”
- 状态规则：
  - `won` -> `approved`
  - `approvalStatus === rejected` -> `rejected`
  - `discovery` -> `draft`
  - `approvalStatus === approved` -> `approved`
  - 其他 -> `reviewing`

### 3.3 投标列表派生规则

代码来源：
- [pipelineMock.ts](/Users/gjy/frontend/src/shared/pipelineMock.ts)

派生规则：
- 仅当商机阶段属于 `proposal / bidding / negotiation / won / lost` 时生成投标记录
- 招标编号规则：`ZN{年份}{id补零}`
- 状态规则：
  - `won` -> `won`
  - `lost` -> `lost`
  - 其他 -> `ongoing`
- 进度规则：
  - `won` -> 已完成
  - `lost` -> 未中标
  - 其他 -> 标书制作

### 3.4 合同列表派生规则

代码来源：
- [pipelineMock.ts](/Users/gjy/frontend/src/shared/pipelineMock.ts)

派生规则：
- 仅当商机阶段属于 `negotiation / won` 时生成合同记录
- 合同名称：`${项目名称}合同`
- 若阶段为 `won`：
  - `status = signed`
  - `signatureStatus = signed`
  - `paymentTerm = 分期付款`
- 若阶段为 `negotiation`：
  - `status = reviewing`
  - `signatureStatus = unsigned`
  - `paymentTerm = 待商务确认`

### 3.5 知识库派生规则

代码来源：
- [pipelineMock.ts](/Users/gjy/frontend/src/shared/pipelineMock.ts)

派生规则：
- 每条商机至少派生一条解决方案说明文档
- 若存在 `requirementBriefDocName`，额外派生一条“经验知识库 / 文档模板”
- 若存在 `researchDocName`，额外派生一条“解决方案知识库 / 场景解决方案”
- `proposal / bidding` 阶段的解决方案说明默认标记为 `isHot`
- 调研文档默认标记为 `isFavorite`

## 4. 知识库基础 Mock 数据

代码来源：
- [KnowledgeView.tsx](/Users/gjy/frontend/src/views/KnowledgeView.tsx)

用途：
- 作为知识库页面的静态基础文档，与共享商机派生文档合并展示。

当前基础文档样例：
- 某银行数字化转型案例
- MES系统解决方案模板
- 技术方案撰写指南
- 金融行业技术白皮书
- 产品功能说明文档
- 【示例】销售一指禅备忘速查表
- 【示例】标准销售话术手册（通用版）
- 【示例】通用售前解决方案模板
- 【示例】金融行业解决方案合集
- 【示例】核心产品白皮书（v1.0）
- 【示例】标准产品操作手册
- 【示例】制造行业趋势与竞品分析报告
- 【示例】项目实施交付模板合集
- 【示例】运维与巡检手册（标准版）
- 【示例】投标文件模板（技术部分）

字段说明：
- `key`: 文档唯一标识
- `name`: 文档名称
- `category`: 分类，统一使用“一级知识库 / 二级分类”格式
- `author`: 作者
- `updatedAt`: 更新时间
- `size`: 文件大小
- `isFavorite`: 是否收藏
- `isHot`: 是否热门

## 5. 知识库目录树默认数据

代码来源：
- [KnowledgeView.tsx](/Users/gjy/frontend/src/views/KnowledgeView.tsx)
- [SettingsView.tsx](/Users/gjy/frontend/src/views/SettingsView.tsx)

本地存储：
- `knowledgeCategoryTreeConfig`

默认一级目录：
- 经验知识库
- 销售知识库
- 解决方案知识库
- 产品知识库
- 行业知识库
- 交付实施知识库
- 投标知识库

说明：
- 知识库页面和系统设置页面共用同一份知识库目录树口径。
- 若修改默认知识库分类，请同时确认知识库页面筛选、上传归类和系统设置中的目录管理说明是否仍一致。

## 6. 审批流程库默认数据

代码来源：
- [workflowTemplates.ts](/Users/gjy/frontend/src/shared/workflowTemplates.ts)

当前默认流程：
- 标准商机审批流程
- 标准解决方案审批流程

### 6.1 标准商机审批流程

流程标识：
- `default_opportunity_flow`

节点：
1. 线索确认
2. 项目启动
3. 需求分析
4. 最终审批

关键规则：
- 线索确认：上传客户需求说明
- 项目启动：分配解决方案负责人
- 需求分析：上传调研文档
- 最终审批：通过 / 驳回
- 驳回策略：`terminate`

### 6.2 标准解决方案审批流程

流程标识：
- `default_solution_flow`

节点：
1. 技术评审
2. 商务评审
3. 最终审批

## 7. 系统设置团队成员默认数据

代码来源：
- [SettingsView.tsx](/Users/gjy/frontend/src/views/SettingsView.tsx)

用途：
- 系统设置中的团队管理表格默认展示数据

当前样例：

| 姓名 | 邮箱 | 角色 | 状态 | 主要行业 | 团队角色 |
|---|---|---|---|---|---|
| 张三 | zhangsan@example.com | 管理员 | 活跃 | 金融行业 | 金融行业负责人 |
| 李四 | lisi@example.com | 销售 | 活跃 | 制造行业 | 制造行业负责人 |
| 王五 | wangwu@example.com | 工程师 | 活跃 | 电商行业、政企行业 | 电商行业负责人 |
| 赵六 | zhaoliu@example.com | 工程师 | 离线 | 园区行业 | 园区行业负责人 |
| 钱七 | qianqi@example.com | 访客 | 活跃 | - | - |

## 8. Mock 数据本地记忆键汇总

当前已使用的关键本地存储键：

| Key | 说明 |
|---|---|
| `sharedDemoOpportunities` | 共享商机数据 |
| `sharedDemoOpportunitiesUpdated` | 商机数据更新事件名 |
| `knowledgeCategoryTreeConfig` | 知识库分类树配置 |
| `projectsTablePreference` | 项目列表列配置与列宽 |
| `opportunitiesTablePreference` | 商机列表列配置与列宽 |
| `solutionsTablePreference` | 解决方案列表列配置与列宽 |
| `bidsTablePreference` | 投标列表列配置与列宽 |
| `contractsTablePreference` | 合同列表列配置与列宽 |
| `knowledgeTablePreference` | 文档列表列配置与列宽 |

## 9. 后续更新要求

后续任何涉及 Mock 数据的修改，至少同步检查以下内容：
- 是否修改了共享商机数据本体
- 是否影响下游派生页面：项目、解决方案、投标、合同、知识库、工作台、数据分析
- 是否新增或调整了本地存储键
- 是否修改了默认知识库目录树
- 是否修改了默认审批流程模板
- 是否需要同步更新本文档中的样例表格和规则说明

建议更新流程：
1. 修改代码中的 Mock 数据或派生逻辑
2. 本地验证页面联动是否正确
3. 更新本文档
4. 更新顶层 README 中的进度或需求说明

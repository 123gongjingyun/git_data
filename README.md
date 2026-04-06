# 项目简介

项目名称：**售前流程全生命周期管理系统**  
定位：面向售前解决方案工程师的专业工作平台，作为现有 CRM 系统的增强模块。  
核心价值：实现售前项目从线索到签约的全流程数字化、标准化管理，包括线索管理、机会跟进、方案编制评审、投标过程跟踪、签约与复盘等。

主要技术栈（已确认部分）：
- 前端：React + TypeScript + Vite + Ant Design
- 后端：Node.js + TypeScript（NestJS 框架）+ MySQL + TypeORM

> 说明：每次新会话开始前，Agent 必须先阅读本文件，确保了解最新状态和任务安排。

## 协作约定

以下协作方式已在本次会话中确认：
- [x] 自 2026-04-06 起，默认采用“`1 个主 agent + 5 个子 agent`”的并行协作模式推进中等及以上复杂度任务；主 agent 负责需求拆分、契约冻结、公共层收口、进度汇总、验证与对外汇报。（确认日期：2026-04-06）
- [x] 子 agent 默认按“模块 / 文件写入边界”分工，而非仅按“前端 / 后端 / 测试”等角色名分工；前端优先按页面文件或共享模块族拆分，后端优先按模块目录拆分。（确认日期：2026-04-06）
- [x] 子 agent 之间默认不直接协商公共契约；出现字段、接口、权限、状态等阻塞时，统一回报主 agent，由主 agent 裁决并回传统一口径。（确认日期：2026-04-06）
- [x] 前端公共入口与共享协议层（如 `App.tsx`、`shared/auth.ts`、`shared/api.ts`、`shared/opportunityDemoData.ts`）以及后端公共入口与实体/运行配置层（如 `app.module.ts`、`config/runtime.ts`、`domain/entities/*`、`users/user-access.ts`）默认仅允许主 agent 修改。（确认日期：2026-04-06）
- [x] 本项目多 agent 并行作战手册已沉淀到 [`docs/multi-agent-team-playbook.md`](./docs/multi-agent-team-playbook.md)，后续新会话在执行复杂任务前应优先参考该文档。（确认日期：2026-04-06）
- [x] 自 2026-04-06 起，默认执行“本地优先验证 -> 验证通过后再同步云上环境”的发布顺序；本地与云上配置、依赖与部署口径应尽量保持一致，避免只在云上临时修正。（确认日期：2026-04-06）
- [x] 自 2026-04-06 起，如当天存在较大的版本功能变动，或即将上线的改动具有明显风险，需在关键变更前后尽快同步到 GitHub，形成可追溯、可回退的远端检查点；是否合并到主分支仍需先征得用户同意。（确认日期：2026-04-06）
- [x] 自 2026-04-06 起，本项目本地统一工作目录切换为 `/Users/gjy/Projects-mygetpre/presales-platform`；为降低迁移期间的中断风险，旧路径 `/Users/gjy/presales-platform` 目前保留为指向新目录的兼容软链接，后续新增脚本、文档和命令应优先使用新路径。（确认日期：2026-04-06）

## 当前需求列表

以下需求均已在本次会话中确认：
- [ ] 功能 1：售前项目基础数据管理（线索 / 商机 / 客户 / 项目阶段），支持从 CRM 导入基础信息。（确认日期：2026-03-18）
- [ ] 功能 2：售前解决方案全生命周期管理，包括方案版本、评审状态、投标状态、签约结果及复盘记录。（确认日期：2026-03-18）
- [ ] 功能 3：面向售前工程师的工作台视图，按优先级展示待办项目、即将到期的关键节点、评审与投标事项。（确认日期：2026-03-18）
- [ ] 功能 4：基础权限与角色支持（售前工程师 / 经理 / 管理员），为后续与 CRM 深度集成预留接口。（确认日期：2026-03-18）
  - 补充约束（确认日期：2026-03-27）：启动“用户认证与团队权限管理一期”，优先落地真实注册 / 登录 / 当前用户信息接口（`/auth/register`、`/auth/login`、`/auth/me`），替换现有“仅校验非空”的演示登录逻辑。
  - 补充约束（确认日期：2026-03-27）：系统设置中的“团队与权限管理”从前端静态 Mock 升级为真实后端用户管理，至少支持成员列表、搜索筛选、新增、编辑、删除，以及基于系统角色自动派生权限摘要。
  - 补充约束（确认日期：2026-03-27）：第一阶段权限模型采用“系统角色映射权限模板”的轻量方案，不在本阶段实现可视化 RBAC 编辑器；前端菜单与页面操作优先基于后端返回的真实角色 / 权限信息进行控制，不再通过用户名关键字推断角色。
  - 补充约束（确认日期：2026-03-27）：新增“菜单权限管理”页面，放在系统设置左侧菜单中，与“流程库”同级；仅管理员可为用户勾选分配更细粒度的菜单可见权限。
  - 补充约束（确认日期：2026-03-27）：菜单权限管理第一阶段只管理主导航与系统设置内独立配置页面的可见性，采用“角色默认菜单权限 + 用户个性化覆盖（allow / deny）”模型，不在本阶段扩展到按钮级操作权限。
  - 补充约束（确认日期：2026-03-27）：启动“操作权限管理二期”，在系统设置中新增独立的“操作权限管理”页面，与“菜单权限管理”并列；管理员可按用户可视化勾选页面动作权限，第一阶段至少覆盖项目管理、商机管理、解决方案、流程库四个模块的新增 / 查看 / 编辑 / 删除 / 下载 / 审批等操作权限。
  - 补充约束（确认日期：2026-03-27）：操作权限继续采用“角色默认动作权限 + 用户个性化覆盖（allow / deny）”模型；前端页面按钮显隐、禁用与关键 Mock 动作拦截统一基于后端返回的最终动作权限集合，不再仅依赖静态角色判断。
- [ ] 功能 5：审批流程库与业务审批实例管理。支持在“系统设置”中维护审批流程库，可自定义流程节点、为节点绑定审批人员，并在节点上执行“通过 / 驳回”审批动作；流程可绑定并复用于“商机管理”和“解决方案管理”的审批环节。（确认日期：2026-03-25）
  - 补充约束（确认日期：2026-03-25）：商机管理仅保留一条“来自流程库”的默认审批流程，不再额外维护独立的内置审批流；该默认流程的节点语义固定为：
    - 线索确认：允许上传需求说明文档；
    - 项目启动：允许分配解决方案负责人；
    - 需求分析：允许上传调研文档；
    - 最终审批：执行通过 / 驳回；
    - 上述节点能力需与商机管理审批弹窗中的实际交互保持一致。
  - 补充约束（确认日期：2026-03-25）：前端“系统设置”中，流程库需提升为与“插件库”同层级的独立设置菜单，不再作为“系统配置”中的次级区块；流程定义中新增“适用商机”字段，并在流程库列表中排在最前面。商机审批时优先按该字段与当前商机名称 / 客户关键词自动匹配流程；若未配置或未匹配到专用流程，则默认回退到标准商机审批流程。
- [ ] 功能 6：项目管理中的项目进度时间线支持阶段导航。已走过和当前阶段节点需提供“跳转到该阶段并自动筛出当前项目”的入口；未经过的阶段节点置灰禁用，不允许点击。（确认日期：2026-03-26）
  - 补充约束（确认日期：2026-03-26）：阶段跳转按项目全流程模块归属执行，`discovery` 跳商机管理，`solution_design / proposal` 跳解决方案管理，`bidding / negotiation` 跳投标管理，`won` 跳合同管理；`lost` 作为终态展示，不作为常规业务跳转入口。
  - 补充约束（确认日期：2026-03-26）：项目与商机之间的共享筛选口径需统一到“项目名派生规则”，从项目管理跳转到商机管理时，应能通过项目名实时命中对应商机；项目详情右下角不再保留独立的“跳转到当前阶段”按钮。
  - 补充约束（确认日期：2026-03-26）：项目列表支持右上角按列多选控制显示项，未选中的列暂时隐藏；表头支持手动拖拽调整列宽，列显隐与列宽偏好保存在本地。
  - 补充约束（确认日期：2026-03-26）：当前前端 Mock 数据需统一登记到独立文档，补充字段说明、派生规则、本地存储键和维护要求；后续 Mock 数据更新统一维护该文档。
  - 补充约束（确认日期：2026-03-26）：项目列表的列设置、显示全部、恢复默认、列宽拖拽、横向滚动和本地记忆能力，需要复刻到商机管理、解决方案、投标管理、合同管理与知识库文档列表；投标管理的“新建标书”按钮调整到页面右上角。
- [ ] 功能 7：平台部署与云上联调一期，先完成单台云服务器可部署化与稳定联调，再进入 `openclaw` / 飞书整合。（确认日期：2026-03-28）
  - 补充约束（确认日期：2026-03-28）：本期服务器规格固定为 `2C2G / 50GB 系统盘 / Ubuntu 22.04 / 公网 IP 101.43.78.27`，首轮使用云服务器 IP 直接联调，不依赖域名与备案。
  - 补充约束（确认日期：2026-03-28）：首轮部署方式采用单机 `Docker Compose`，服务拓扑固定为 `Nginx + 前端静态站点 + NestJS 后端 + MySQL`，暂不在本阶段接入 `openclaw`、飞书、Prometheus、Grafana 等附加组件。
  - 补充约束（确认日期：2026-03-28）：前端必须移除所有写死的 `http://localhost:3000` 接口地址，统一改为基于环境变量的 API 基地址配置，以支持本地、云服务器 IP 和后续域名三种运行环境。
  - 补充约束（确认日期：2026-03-28）：后端部署到云上时统一使用同机 MySQL，不再沿用 SQLite 开发默认态；生产环境需通过环境变量控制端口、CORS、JWT、数据库连接与 `synchronize` 开关。
  - 补充约束（确认日期：2026-03-28）：`openclaw` 当前仅定位为后续“问答与助手入口”，本阶段不接入、不占用服务器资源；平台自监控页面也不在本期范围内，仅保留后端健康检查与最小化运维能力。
  - 补充约束（确认日期：2026-03-29）：由于本地环境当前 `npm` 依赖问题暂未稳定安装 MySQL 相关依赖，允许本地暂时保留 `SQLite / MySQL` 双入口以便继续开发；但云服务器与正式部署口径必须固定为真实 MySQL，并保证后续本地代码、配置模板与云上保持一致。
  - 补充约束（确认日期：2026-03-29）：云服务器资源固定为 `2C2G`，后续一切部署、联调、修复与上线动作，必须以“服务稳定、不打满内存、不引入额外重型组件”为第一原则，优先采用最小重建、最小容器变更和最小数据初始化策略。
  - 补充约束（确认日期：2026-03-29）：本轮需顺带完成一组线上 UI 收口，包括：修复工作台“本月业绩趋势”卡片内容溢出；修复深色模式下工作台、商机管理、解决方案、投标管理、合同管理、知识库、数据分析及系统设置各子页中卡片/搜索区白边被阴影覆盖的问题；移除深浅色模式下平台搜索框与登录输入框的内层长方形描边；去除登录成功后的重复成功提示，仅保留一条。
  - 补充约束（确认日期：2026-03-29）：若前一轮 UI 收口后仍存在残留问题，应继续按页面精修，不再通过切换菜单触发“已切换到：xxx”提示；卡片边框视觉效果需以“白边完整可见、阴影退居其后”为准，优先对齐“项目管理 > 项目列表”这一视觉基准；工作台“本月业绩趋势”中部图例与柱图区若仍溢出，需继续压缩布局直至线上无溢出。
  - 补充约束（确认日期：2026-03-29）：数据分析页中的“业绩趋势”卡片不能只显示数字和空白底板，需补成有明确图形填充的可视化趋势图，并保证默认跳转进入该页时始终能看到有数据的趋势展示；同时“销售漏斗”和“业绩趋势”两张卡片高度需保持一致，默认仪表盘入口页不允许被删除。
  - 补充约束（确认日期：2026-03-29）：继续优化数据分析页交互与用户管理细节。销售漏斗内部布局需避免标签、柱条和数据互相遮挡；行业分布需提供悬停即见的颜色-数据映射提示；项目进度甘特图中右侧图形不得压住左侧项目名称，必要时可替换为更稳的图表形式。团队管理操作列需补齐“禁用/启用”按钮；编辑成员时“重置密码”输入框旁需提供“随机生成密码”按钮，管理员可手输或一键生成；删除成员必须保留二次确认；被禁用账号登录时需明确提示“你的账号已经被禁止登陆”。
  - 补充约束（确认日期：2026-03-29）：继续收口数据分析页与全平台删除交互。数据分析页在深色模式下，标准销售仪表盘、趋势分析仪表盘、管理层概览仪表盘、金融经营仪表盘、制造推进仪表盘中的内部组件面板不得再出现突兀白底；金融经营仪表盘与制造推进仪表盘需补齐为 4 个组件，保持页面完整度一致。平台内所有“删除”按钮均需统一改为先弹出二次确认框，再允许执行删除。
- [ ] 功能 8：启动“飞书机器人 + OpenClaw + 平台”最小 MVP 整合，在不影响当前售前管理平台主业务开发、联调、部署的前提下，先打通飞书私聊机器人中的待审批查询、业务摘要查看、轻量审批和消息推送闭环。（确认日期：2026-04-02）
  - 补充约束（确认日期：2026-04-02）：当前平台仍为唯一业务主数据源；飞书仅作为消息入口、通知入口和轻量审批入口，禁止在 MVP 阶段引入会反向改写主业务事实的旁路数据源。
  - 补充约束（确认日期：2026-04-02）：OpenClaw 在 MVP 阶段仅提供自然语言理解、摘要整理和只读问答能力；审批等写操作仍必须通过平台后端执行并保留现有审批权限、审批实例和审计逻辑。
  - 补充约束（确认日期：2026-04-02）：MVP 第一阶段只做飞书私聊机器人，不先开放复杂群聊协同、飞书 Base 双向同步、自动建群、自动建日程和飞书文档深度写入。
  - 补充约束（确认日期：2026-04-02）：若后续需要将平台代码自动打包并同步到 GitHub，必须先将平台代码收敛为明确的 Git 仓库边界，再接入 GitHub 仓库与自动化构建；不得直接将整个家目录或与平台无关的目录纳入版本库。
  - 补充约束（确认日期：2026-04-03）：已进入“字段级接口设计 + 开发方案”阶段；飞书 / OpenClaw MVP 的接口、表结构、卡片字段、OpenClaw skill 和开发拆分，统一以 [docs/feishu-openclaw-interface-design.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/feishu-openclaw-interface-design.md) 为当前实现基线。
  - 补充约束（确认日期：2026-04-03）：当前开发策略调整为“前端优先、后端接口预留”。先在平台内完成“飞书集成”页面、绑定管理、命令预览和卡片预览，前端 Mock 字段必须严格对齐接口设计文档；后端本阶段先保证 DTO、接口签名和示例返回稳定，暂不急于接真实飞书回调与 OpenClaw 联调。
  - 补充约束（确认日期：2026-04-03）：云服务器 `101.43.78.27` 已完成飞书后端代码补同步、`presales-backend` 新镜像重建与运行态校验；当前容器内已确认存在 `dist/integrations/feishu`、`messages/approval-cards/send` 路由、`im.message.receive_v1` 私聊事件处理和“待我审批”命令逻辑。下一步若要真正联通飞书，需要继续补齐云端 `.env` 中的 `BACKEND_FEISHU_APP_ID / BACKEND_FEISHU_APP_SECRET / BACKEND_FEISHU_VERIFICATION_TOKEN / BACKEND_FEISHU_ENCRYPT_KEY` 实值。

新增或变更需求时流程：
- 先在会话中与你讨论，达成一致；
- 立即在本节更新需求条目和简要说明。

## 设计方案概要

前端架构（Web）：
- 使用 React + TypeScript + Vite 搭建单页应用（SPA），Ant Design 作为 UI 组件库，React Query 管理异步数据请求。
- 路由大致划分为：登录/接入页、售前项目列表、项目详情（阶段视图）、解决方案库、个人工作台等。

后端架构：
- 使用 Node.js + TypeScript + NestJS 搭建 RESTful API（后续可扩展为 GraphQL 或 gRPC）。
- 使用 MySQL 作为关系型数据库，配合 TypeORM 管理实体和迁移。
- 核心实体：用户、客户、线索、商机、售前项目、方案版本、评审记录、投标记录、合同 / 签约记录、复盘记录。
- 预留与现有 CRM 集成的同步接口（如客户、商机基础信息同步）。

基础非功能设计要点：
- 采用基于 JWT 的认证机制，后续可对接统一登录。
- 引入审计字段（创建人、更新时间、状态变更日志）以支持过程管理与合规要求。

## Mock 数据文档

- 当前前端使用的核心 Mock 数据、派生规则、本地存储键和维护约束统一记录在 [docs/mock-data-catalog.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/mock-data-catalog.md)。
- 后续凡是新增、修改、删除 Mock 数据，必须同步更新该文档；不得只改代码不改文档。
- 补充约束（确认日期：2026-03-27）：所有后续开发必须建立在“当前已开发版本”的基础上推进，包括当前代码实现、当前页面交互和当前 Mock 数据基线；禁止将浏览器 `localStorage` 中临时操作出来的状态误当作新的产品基线。
- 补充约束（确认日期：2026-03-27）：前端流程库 Mock 数据的基线以 [workflowTemplates.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/workflowTemplates.ts) 中的默认模板为准；若浏览器本地流程库数据与代码基线不一致，应优先回滚到代码默认模板，再继续后续功能开发与联调。

## 部署文档

- 平台上云一期部署手册见 [docs/cloud-deployment-phase1.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/cloud-deployment-phase1.md)。
- 最小上传包与检查清单见 [docs/cloud-upload-checklist-phase1.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/cloud-upload-checklist-phase1.md)。
- 本地开发、云端发布与应急修复回传约定见 [docs/release-runbook.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/release-runbook.md)。
- 域名 HTTPS 接入任务清单与实施方案见 [docs/https-rollout-plan.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/https-rollout-plan.md)；当前 `www.getpre.cn` 仍在备案中，先完成准备，不执行正式切换。
- 云服务器项目目录使用的 Codex 约定源文档见 [docs/cloud-server-codex-AGENTS.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/cloud-server-codex-AGENTS.md)，其已同步到服务器 `/opt/presales-platform/AGENTS.md`。
- 云服务器 `deploy` 用户下的 Codex 运维约定源文档见 [docs/cloud-server-codex-SERVER_CONVENTIONS.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/cloud-server-codex-SERVER_CONVENTIONS.md)，其已同步到服务器 `/home/deploy/.codex/SERVER_CONVENTIONS.md`。
- 飞书 / OpenClaw 最小 MVP 独立任务文档见 [docs/feishu-openclaw-mvp-README.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/feishu-openclaw-mvp-README.md)。
- 飞书 / OpenClaw MVP 接口字段设计与开发方案见 [docs/feishu-openclaw-interface-design.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/feishu-openclaw-interface-design.md)。
- GitHub 代码托管与自动打包落地方案见 [docs/github-rollout-plan.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/github-rollout-plan.md)。

### 本地仓库收口进展（2026-04-02）

- 已在本机新建独立目录 `/Users/gjy/Projects-mygetpre/presales-platform`，作为后续 GitHub 托管的本地候选仓库根目录。
- 当前采取“复制收口、非破坏式准备”策略：不移动 `/Users/gjy` 下现有开发目录，先将平台相关内容复制到独立目录，避免影响当前业务开发、联调与云端修复节奏。
- 已在独立目录补齐 `.gitignore`、`.env.example`、`.gitlab-ci.yml` 和本地仓库收口清单 `docs/local-repo-bootstrap-checklist.md`；其中 `.gitlab-ci.yml` 当前仅作为构建思路样板，接入 GitHub 时需迁移为 GitHub Actions 工作流。当前可继续进入 `git init / GitHub origin / 首次推送` 阶段。

### 本地目录迁移补记（2026-04-06）

- 已将平台主项目实际迁移到 `/Users/gjy/Projects-mygetpre/presales-platform`，便于在 `/Users/gjy` 下集中管理与快速定位。
- 旧路径 `/Users/gjy/presales-platform` 当前保留为软链接，用于兼容部分历史命令、文档引用和工具配置；后续应逐步以新路径为唯一主路径。
- 部署压缩包 `presales-platform-phase1.tar.gz` 已同步收口到 `/Users/gjy/Projects-mygetpre/presales-platform-artifacts/`，旧位置保留软链接兼容入口。

### 云端联调收口补充（2026-04-02）

- 商机审批弹窗针对“后端审批实例为空、但业务快照已推进/已驳回”的线上脏数据场景，新增只读快照回退展示：
  - 若审批在第 2 / 3 / 6 节点被驳回，则其后的第 4 / 5 / 6（或后续）节点统一显示为“未执行”，不再沿用解决方案负责人、调研文档等后置字段作为激活态展示；
  - 审批记录区在真实 `approval_instance_actions` 为空时，按商机真实业务字段（需求说明、销售审批、方案审批、负责人分配、调研文档、最终审批）合成只读时间线，避免线上“审批记录为空白”；
  - 当只读快照记录已生成时，不再额外显示“当前暂无流程记录”，避免与已展示的快照记录相互矛盾。

### 审批流程库设计补充（2026-03-25）

为满足“系统设置中配置流程库，并绑定到商机管理 / 解决方案管理审批节点”的新需求，审批能力按“流程定义层 + 审批实例层”拆分设计，避免将审批逻辑写死在业务实体中。

- 流程定义层（Workflow Definition）：
  - 用于维护可复用的审批模板，按目标对象区分 `opportunity`（商机）与 `solution`（解决方案）；
  - 每个流程包含基础信息（名称、描述、启停状态、版本）以及按顺序排列的流程节点；
  - 每个流程节点至少包含：节点名称、节点顺序、审批动作配置（是否允许驳回、驳回策略）、审批人绑定规则。
- 节点审批人绑定规则：
  - 第一阶段同时支持三类绑定方式的模型设计：指定用户（user）、指定角色（role）、业务字段映射（field）；
  - 其中第一阶段实现可先落“指定用户”为主，并在接口模型中预留 `approverType / approverRef` 字段，后续再扩展至角色和业务字段。
- 审批实例层（Approval Instance）：
  - 当商机或解决方案发起审批时，不直接引用实时流程定义执行，而是基于当前流程模板生成一份审批实例快照；
  - 审批实例记录所属业务对象、当前节点、整体状态、发起人、发起时间、完成时间；
  - 实例下挂节点实例与审批动作记录，用于保存每个节点的审批状态、审批人、审批意见以及“通过 / 驳回”历史。
- 与业务模块的绑定方式：
  - 商机管理：流程库中 `target = opportunity` 的流程可设为默认流程或在发起审批时手工选择，用于商机的立项/方案阶段审批；
  - 解决方案管理：流程库中 `target = solution` 的流程可设为默认流程或在发起审批时手工选择，用于方案版本的评审/审批流转；
  - 商机与解决方案实体仅保留审批结果摘要字段（例如当前审批状态、当前审批实例 ID），完整审批过程统一由审批实例模块管理。
  - 对于前端商机管理 Demo 视图，当前明确约束为“只展示一条来自流程库的默认商机审批流程”，节点操作区必须直接对应该流程，而不是并列展示第二套独立内置审批说明。
  - 在商机管理中，流程选择优先级调整为：`适用商机关键词命中流程` > `被设为默认的商机流程` > `标准商机审批流程`。
- 第一阶段审批流转规则：
  - 发起审批：业务对象状态变更为 `in_review`，创建审批实例并激活第一个节点；
  - 节点通过：当前节点标记为 `approved`，若存在下一个节点则继续流转，否则审批实例整体变为 `approved`；
  - 节点驳回：在任意一个节点发生驳回时，当前节点标记为 `rejected`，审批实例整体立即变为 `rejected`，流程结束，不再回退到上一节点或起点，业务对象同步记录“全部驳回”结果与意见；
  - 第一阶段不实现条件分支、会签、加签、转交，也不实现“驳回后返回上一节点 / 返回起点”能力，优先保证线性审批链路可稳定落地。

## 项目推进阶段模型与模块映射

为保证平台前后端在“阶段”语义上的统一，本系统采用一套标准的售前项目推进阶段模型，并以此为基础划分各业务模块的职责。

### 标准阶段模型

系统内部统一使用如下阶段枚举（后端 `OpportunityStage` 与前端各视图共用）：
- `discovery`（发现）：识别商机、确认客户需求与痛点，完成基本立项判断；
- `solution_design`（方案设计）：结合客户需求进行技术与业务方案设计，形成初版解决方案；
- `proposal`（提案）：基于已评审通过的方案输出正式提案文档、报价与实施计划，并向客户进行展示；
- `bidding`（投标）：参与客户正式招投标流程，准备和提交投标文件；
- `negotiation`（谈判）：在中标候选或优选阶段，与客户就价格、范围、条款等进行商务与合同谈判；
- `won`（中标）：客户正式确认中标 / 签约，进入合同履约与后续交付阶段；
- `lost`（丢单）：在任一阶段因竞争、预算、方案不匹配等原因导致机会关闭失败。

阶段间的典型推进链路为：
`发现(discovery)` → `方案设计(solution_design)` → `提案(proposal)` → `投标(bidding)` → `谈判(negotiation)` → `中标(won)`；  
在任意中间阶段均可能转入 `丢单(lost)` 终止流程，用于后续复盘和数据分析。

### 模块与阶段的职责划分

在此阶段模型之上，各前端业务模块的职责边界约定如下（后端实体与 API 同样按该规范建模）：
- 项目管理（Projects）：承载整个售前项目全生命周期视角，覆盖所有阶段 `discovery / solution_design / proposal / bidding / negotiation / won / lost`，用于按项目维度统一查看从机会发现到中标 / 丢单的完整推进情况；
- 商机管理（Opportunities）：聚焦早期“发现”阶段的线索与商机，仅管理处于 `discovery` 阶段的机会，用于拉通 CRM 线索、快速评估并筛选出需要进入方案设计的商机；
- 解决方案管理（Solutions）：围绕 `solution_design` 与 `proposal` 阶段，管理方案版本、评审状态与提案输出，帮助售前团队在进入投标前把方案做“深、准、稳”；
- 投标管理（Bids）：承接 `bidding` 与 `negotiation` 阶段，管理投标项目、招标编号、投标文件、开标时间、投标金额与谈判进展，支撑从递交标书到商务谈判的全过程跟踪；
- 合同管理（Contracts）：面向 `won` 阶段的已中标 / 已签约项目，管理合同信息、金额、付款条件、签约日期及履约状态，是售前到交付、回款的衔接入口；
- 丢单（lost）：丢单不是独立模块，而是一种可从任意阶段达成的终态；项目管理和后续数据分析视图需要识别并统计所有阶段转入 `lost` 的记录，用于复盘与优化销售 / 售前策略。

上述阶段代码（如 `discovery`、`solution_design` 等）已在后端实体 `OpportunityStage` 以及前端项目管理 / 商机管理等视图中统一使用；后续新增模块或接口时，应继续复用同一套阶段枚举与语义，不再引入新的阶段命名，以保持平台内阶段口径的一致性。

## 界面预览

- 登录页模板预览（前端）：  
  请将你在本地访问 `http://localhost:5173`（或自定义端口）时的登录页面截图保存为  
  `docs/screenshots/login-template-2026-03-19.png`，并使用如下 Markdown 引用方式嵌入（已为你预留路径约定）：  
  `![登录页模板预览](docs/screenshots/login-template-2026-03-19.png)`

> 说明：仓库中目前未包含实际图片文件，请你在本地完成截图后，将文件放置到 `docs/screenshots/` 目录下并命名为 `login-template-2026-03-19.png`，即可与本节引用保持一致。

## 前端商机列表与方案版本（Mock / 真机说明）

- 当前前端在登录成功后会展示“商机列表”视图，但暂未强制依赖真实数据库与后端 `/opportunities` 接口。  
- 在前端整体布局上，已集成基于 `pre-sales-system/demo.html` 的左侧菜单 + 顶部导航结构：登录成功后会进入包含左侧菜单（工作台、项目管理、商机管理、解决方案、投标管理、合同管理、知识库、数据分析、系统设置）和右侧内容区的主界面；当前所有顶部菜单页面（工作台、项目管理、商机管理、解决方案、投标管理、合同管理、知识库、数据分析、系统设置）均已基于 `frontend/pre-sales-system/demo.html` 完成首版 UI 复刻，整体视觉风格保持一致（左侧深色菜单 + 顶部浅色顶栏），内容区域不再重复显示“Demo 视图”字样，仅保留功能相关模块和示例数据。
- 在 `frontend/src/views/OpportunitiesView.tsx` 中通过常量 `USE_MOCK_OPPORTUNITIES` 控制商机及方案版本数据来源（可由前端环境变量 `VITE_USE_MOCK_OPPORTUNITIES` 决定，默认为 `true`）：
  - 当 `USE_MOCK_OPPORTUNITIES = true`（默认行为）时：
    - 商机列表使用内置的示例数据（Mock），便于在未接入数据库的情况下预览 UI 与交互流程；
    - 登录成功后会展示“商机列表 + 商机详情”双栏视图：左侧为可点击的商机列表，右侧为当前选中商机的详情卡片（名称、阶段、客户、负责人、预估金额、预期签约日期、成交概率及简要描述等），用于验证后续“项目详情页”的信息布局。
    - 支持在前端基于 Mock 数据进行按关键词检索、阶段筛选与简单排序，并在顶部展示阶段分布概览：
      - 顶部提供“搜索”输入框，可按商机名称、客户名称或负责人（displayName / username）进行本地模糊搜索；
      - 通过页面上的“阶段筛选”下拉框，可以筛选展示特定阶段（如 discovery / solution_design / won 等）的商机列表；
      - 通过“排序”下拉框，可以选择按创建时间（最新在前）或按预估金额（从高到低 / 从低到高）对商机列表进行排序，用于预演后续的列表排序交互。
      - 在“总商机数 / 进行中商机数 / 待评审方案版本”统计下方，会额外展示“各阶段商机数”摘要，例如“需求挖掘：2｜方案设计：3｜中标：1”，用于快速了解当前售前项目阶段分布情况。
    - 支持按“负责人”维度过滤：通过“只看我负责的”开关（基于当前登录账号 username 与商机 owner.username 比较），可仅展示当前售前工程师负责的商机，用于预演个人工作台视角下的商机列表。
    - 商机管理列表已补充“序号”列与分页能力，并新增全局唯一的“商机编号”字段（前端示例格式：`OPP-000001`）；该编号会在商机列表中展示，并同步用于项目管理详情页中的关联商机列表展示。当前前端已将“商机管理”与“项目详情中的关联商机列表”切换为读取同一份共享商机数据，项目详情中新建/删除关联商机会直接同步到商机管理视图，不再是两套独立 Mock 数据。
    - 当前前端已进一步将“解决方案 / 投标管理 / 合同管理 / 知识库”切换为基于同一份共享商机数据进行派生展示：商机中的需求说明、调研文档、方案负责人、阶段、金额等字段，会自动影响下游方案列表、投标列表、合同列表以及知识库中的沉淀文档；同时各页面仍保留本地 Mock 的新建 / 审批 / 收藏 / 签署等覆盖交互，用于预演从“商机 -> 项目 -> 方案 -> 投标 -> 合同 -> 知识库”的完整联动链路。
    - 共享商机 Mock 数据已补充更多 `proposal / negotiation / won` 阶段示例记录，用于在投标管理与合同管理中自动派生出更多示例数据；同时在读取本地共享商机缓存时，会自动补齐新加入的默认 Mock 记录，避免旧浏览器缓存导致合同管理看不到新增示例数据；投标管理页面因缺失 `Select` 组件导入导致的白屏问题也已修复。
    - 工作台（`WorkbenchView`）已切换为基于共享商机数据实时计算卡片指标，不再展示写死统计值；“进行中项目 / 活跃商机 / 解决方案 / 投标项目 / 预计签约金额 / 本月签约”会随着共享数据更新即时变化。待办任务也已改为从当前共享数据中提取代表项，点击后会跳转到对应业务页面，并自动按当前项目名称或阶段进行筛选定位。其中“本月业绩趋势”卡片已改为金额口径面板，展示本月新增商机金额、本月签约金额、活跃商机金额、本月签约率，以及最近 6 个月的新增/签约金额趋势；同时已将“高概率商机金额 / 待签约储备金额 / 平均单项目金额”收回卡片内部底部摘要区，并将“更多项目”入口移动到最近项目卡片右上角，且去掉了最近项目分页中的快速跳页说明。现已进一步将“本月签约金额”与“本月业绩趋势”统一到共享月度统计函数，按共享商机派生出的合同签约日期实时计算，确保与合同管理口径一致。
    - 数据分析页（`AnalyticsView`）中的“标准销售仪表盘”已切换为基于共享商机数据实时派生：顶部指标卡、销售漏斗、业绩趋势、行业分布、项目进度甘特图会随着共享商机数据更新而同步变化；原“全球 3D 客户大屏”已调整为“3D 客户大屏”，默认以全国 3D 客户地图进行展示，并兼容已有本地缓存配置的自动迁移；同时已新增“全国地图组件”作为数据分析设计器中的正式组件类型，可在自定义仪表盘中直接添加。现已与工作台共用同一套月度签约 / 趋势计算逻辑，使标准销售仪表盘中的“本月签约”和“业绩趋势”与合同管理、工作台保持一致。
    - 项目管理页面现已切换为基于共享商机数据派生项目列表，并保留本地 Mock 的新建 / 编辑 / 删除覆盖能力；顶部“项目总数 / 进行中 / 已归档 / 总预算”四张统计卡片不再使用写死数字，而是与当前项目列表实时联动，确保页面刷新、商机同步或项目列表变更后统计值立即一致。
    - 在商机详情卡片下方，当前已通过 Mock 数据预留了“方案版本（示例）”区域，用于展示与该商机关联的若干方案版本名称、版本号、状态与摘要说明，并支持在前端通过“新建方案版本（Mock）”按钮追加示例数据，以便后续对接后端真实的方案版本管理功能（当前版本已不再在商机管理页面内提供真实评审记录的增删改查能力）。
    - 在 Mock 模式下，“方案版本”区域支持按状态进行筛选（草稿 / 评审中 / 已通过 / 已驳回 / 已归档）以及按创建时间进行简单排序（最新在前 / 最早在前），方便在不接入真实后端的情况下预演后续版本管理视图的交互体验。
    - 在商机详情区域中，新增“关键阶段时间轴（示例）”，基于当前阶段构造从“创建商机”到“当前阶段”的若干示意节点，并在每个节点上以当前负责人（owner）为基础 Mock 出“责任人：XXX（示例）”信息，用于预演后续接入真实阶段变更记录和责任人信息后在页面中展示完整推进时间轴的方式；
    - 评审记录能力不再在当前商机管理页面中展示，方案版本卡片仅保留状态与摘要文案占位，不提供任何评审记录列表或“查看评审记录”链接；后续完整的评审记录查看与维护能力将放在专门的评审视图中实现。
    - 后端只需提供 `/auth/login` 与 `/auth/me` 即可完成登录与基础鉴权联调。
    - 基于 `frontend/pre-sales-system/demo.html`，新增了一个 React 版“售前工作台 Demo 视图”（`PreSalesDemoView`），可在登录后通过顶栏按钮切换到该视图，以便在当前应用中预览更完整的售前工作台布局与交互示例（统计卡片、重点商机列表、待办事项、方案审批进度、商机详情与文档 / 合同相关操作占位等）。
    - 在前端进一步基于 `frontend/pre-sales-system/demo.html` 复刻了“投标管理”、“合同管理”、“知识库”、“数据分析”、“系统设置”等菜单对应的页面视图，并在左侧菜单最下方新增了“帮助与支持”入口，同时增加了“插件库”菜单用于统一管理图标与 Logo，目前均采用 Mock 数据，主要用于 UI 与交互预演：
      - “投标管理”：包含投标总数 / 中标数等统计卡片以及投标项目列表（项目名称、客户、销售负责人、售前负责人、招标编号、进度、开标时间、投标金额、状态与操作），整体布局与 demo.html 中“投标管理”区域保持一致，目前“销售负责人 / 售前负责人”列使用与团队管理一致的中文示例名称，便于后续与角色配置联动；当前列表已补充“序号”列、分页能力、关键字搜索框与“全部状态”筛选框；
      - “合同管理”：提供合同搜索输入框与状态筛选下拉框，顶部展示合同总数、总合同金额、已签约与执行中等统计卡片，下方为合同列表（合同名称、客户、销售负责人、售前负责人、金额、付款条件、签约日期、状态与操作），并内置“生成合同（示例）”弹窗，用于演示合同生成流程，其中销售负责人 / 售前负责人同样采用与项目 / 商机 / 解决方案视图一致的示例负责人名称，方便后续打通角色模型；当前列表已补充“序号”列与分页能力；
      - “知识库”：提供文档搜索框与分类筛选下拉框，顶部展示文档总数、分类数量、我的收藏、热门文档等统计卡片，左侧为可点击的文档分类卡片列表（点击后联动右侧列表筛选并高亮当前分类），右侧为基于 Mock 文档数据驱动的文档列表表格（文档名称、分类、作者、更新时间、大小及预览 / 下载 / 删除示例操作），并内置“上传文档”模态框：支持点击/拖拽选择示例文件、选择文档分类以及根据最近文件名给出的分类推荐提示，确认上传后会按所选分类将示例文件追加到当前文档列表（不执行真实文件上传，仅前端 Mock），用于预演后续接入真实文档库与搜索服务后的知识库体验。
      - “数据分析”：复刻 demo.html 中的销售数据驾驶舱，包含商机总数 / 本月签约 / 平均成交周期 / 商机转化率等统计卡片，以及销售漏斗、月度业绩趋势柱状图、行业分布（环形图示意）和项目进度甘特图，目前为静态示例数据；
      - “系统设置”：复刻 demo.html 中的系统设置视图，左侧为设置菜单（个人资料、安全设置、通知设置、团队管理、系统配置、数据管理），右侧为“团队与权限管理”表格，列出成员姓名、邮箱、角色、权限范围与状态，并在下方提供权限说明区域，用于演示后续对接真实用户与权限模型时的界面布局。
      - “插件库”：在左侧菜单中新增“插件库”入口（`PluginLibraryView`），用于集中管理平台的图标和 Logo 资源，当前提供基于 Mock 数据的图标 / Logo 列表（名称、类型、格式、尺寸、标签及引用标识），支持通过“上传图标 / Logo（Mock）”弹窗模拟上传并添加新资源，以及在列表中进行预览、下载（示例）和复制“引用标识”；后续平台各业务页面中的图标可通过该引用标识统一从插件库中挑选和引用，以保证视觉与品牌的一致性。
      - “帮助与支持”：在左侧菜单栏最下方新增独立入口（`HelpSupportView`），当前提供用户手册下载占位说明、在线帮助 / FAQ 占位说明以及示例性的技术支持联系方式（电话、邮箱），用于预演后续接入真实用户手册下载、在线帮助中心和内部服务台的统一入口。

## 前端 demo.html 复刻任务列表

- [x] 左侧菜单 + 顶部顶栏整体布局  
  复刻 pre-sales-system/demo.html 的主布局：左侧为深色侧边栏菜单（工作台、项目管理、商机管理、解决方案、投标管理、合同管理、知识库、数据分析、系统设置），右侧为包含浅色顶栏与内容区域的主工作区；顶栏左侧为折叠按钮 + 当前页名，右侧为通知图标、头像与当前登录用户信息。
- [x] 工作台（含今日待办 / 审批进度 / 时间线 / 文档概览等示例模块）  
  使用 `PreSalesDemoView` 复刻 demo.html 中的工作台区域，包含统计卡片、重点商机列表、今日待办、方案审批进度、售前项目进展时间线、项目文档概览及相关弹窗（商机详情、审批流程、生成合同示例等），当前全部基于 Mock 数据。
- [x] 项目管理视图（共享工作台布局与列表组件）  
  通过 `PreSalesDemoView` 的不同 `mode` 复用工作台布局，从项目维度展示商机列表与统计卡片，为后续接入真实“项目”实体预留位置；补充了独立的 `ProjectsView`（`frontend/src/views/ProjectsView.tsx`）原型，用于以更贴近真实业务字段的方式展示项目列表（拆分后的销售负责人 / 售前负责人、预计签约日期、成交概率、关联商机数、方案版本数等）和项目详情时间线；项目列表顶部提供“搜索项目 / 客户 / 人员...”输入框，支持同时按项目名称、客户名称以及销售 / 售前负责人姓名进行模糊搜索，并在右侧增加“按负责人多选过滤”下拉框，可一次性按多位销售 / 售前负责人过滤项目列表（示例）；项目列表已补充“序号”列与分页能力，支持分页大小切换和快速跳页；项目名称点击后会直接打开当前项目的详情视图（不再按阶段直接跳走），并在项目详情中展示包含“所属行业负责人”的完整项目信息，以及“关联商机列表（示例）”表格和“新建关联商机（Mock）”能力：可以在项目详情中快速为当前项目追加基于前端状态维护的关联商机（名称、金额、阶段、签约时间等），默认以当前项目的“售前负责人”作为关联商机的负责人，用于演示后续基于 Opportunity 实体按项目聚合展示数据的交互方式；同时，项目详情页底部原“跳转到商机管理”按钮已调整为“跳转到对应阶段里的此项目”，会携带当前项目名称与阶段联动到商机管理视图，用于更准确地定位对应记录。
- [x] 商机管理视图（共享工作台布局与列表组件）  
  使用 `PreSalesDemoView` 的 `mode="opportunities"` 展示商机列表与示例详情弹窗，用于预演后续接入 Opportunity 实体及相关 API。
- [x] 解决方案视图（共享工作台布局与示例方案模块）  
  使用 `PreSalesDemoView` 的 `mode="solutions"`，突出方案相关的统计与审批示例模块，为后续接入 SolutionVersion / ReviewRecord 实体预留 UI；在独立的 `SolutionsView`（`frontend/src/views/SolutionsView.tsx`）中，方案列表展示方案名称、关联项目、版本、类型、审批状态、创建时间及“解决方案负责人”等基础信息，负责人列示例性使用“张三（金融行业负责人）、李四（制造行业销售）、王五（电商行业负责人）、赵六（园区行业负责人）”等中文名称，便于后续与团队管理中的角色配置联动；当前列表已补充“序号”列与分页能力。
- [x] 投标管理视图（`BidsView`）  
  一比一复刻 demo.html 中“投标管理”区域，包含投标统计卡片与投标项目列表（项目名称、客户、招标编号、进度、开标时间、投标金额、状态与操作），当前使用静态示例数据；列表已补充“序号”列、分页能力、搜索框与状态筛选。
- [x] 合同管理视图（`ContractsView`）  
  一比一复刻 demo.html 中“合同管理”区域，提供合同搜索与状态筛选、合同统计卡片以及合同列表（合同名称、客户、金额、付款条件、签约日期、状态与操作），并包含“生成合同（示例）”弹窗，用于演示合同生成流程；列表已补充“序号”列与分页能力。
- [x] 知识库视图（`KnowledgeView`）  
  一比一复刻 demo.html 中“知识库”区域，支持文档搜索和分类筛选，展示知识库统计卡片、左侧分类卡片以及右侧文档列表表格，全部基于 Mock 文档数据。
- [x] 数据分析视图（`AnalyticsView`）  
  一比一复刻 demo.html 中“数据分析 / 销售驾驶舱”区域，包含商机总数、本月签约、平均成交周期、商机转化率等统计卡片，以及销售漏斗、月度业绩趋势柱状图、行业分布环形图示意和项目进度甘特图；在此基础上新增“仪表盘管理（Mock）”能力：提供仪表盘下拉框用于切换不同仪表盘（标准销售、趋势分析、管理层概览等示例），支持“新建仪表盘（Mock）”弹窗（可自由勾选销售漏斗 / 业绩趋势 / 行业分布 / 项目进度甘特图等组件作为当前仪表盘内容）、设定默认仪表盘，并在页面底部以标签形式提供仪表盘组件顺序的拖拽示例（记录组件顺序但不改变当前布局），用于预演后续支持“新建仪表盘、选择样式与数据、拖拽调整组件顺序并保存为默认数据分析首页”的能力，当前全部为前端示例数据与交互占位。
- [x] 系统设置视图（`SettingsView`）  
  一比一复刻 demo.html 中“系统设置”区域，左侧为设置菜单（个人资料、安全设置、通知设置、团队管理、系统配置、数据管理），右侧为“团队与权限管理”表格及权限说明，目前使用静态成员列表与角色/权限说明预演后续接入真实用户与权限模型的界面布局；在“团队管理”表格中，已预留“所属行业”（支持多行业标签）和“团队角色”列（示例：销售张三 → [金融行业] / 金融行业负责人），支持在顶部按姓名 / 邮箱 / 行业 / 团队角色关键字搜索以及按系统角色 / 状态下拉筛选成员，可在此处手动维护销售与所属行业及团队内业务角色（如：金融行业负责人、电商行业负责人、园区行业负责人、解决方案负责人、销售等）的关系；同时在权限说明中预设了基础权限模型示例：销售可创建商机、查看项目 / 解决方案 / 知识库，工程师可查看商机 / 项目 / 投标管理 / 合同管理并编辑解决方案 / 知识库 / 数据分析，后续可作为项目视图中“所属行业负责人”及其他角色联动规则和权限控制设计的参考（当前仍为前端 Mock，不参与实际计算，仅占位）。
  - 当 `USE_MOCK_OPPORTUNITIES = false` 时（例如在前端 `.env` 中设置 `VITE_USE_MOCK_OPPORTUNITIES=false`）：
    - 商机列表：
      - 前端会通过 `GET http://localhost:3000/opportunities` 调用后端真实商机列表 API；
      - 需要在后端启用数据库，并正确配置 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` 等环境变量，让 `DomainModule` 与 `OpportunitiesModule` 正常工作。
    - 方案版本列表：
      - 商机详情右侧的“方案版本”区域不再使用本地 Mock 数组，而是通过自定义 Hook `useSolutionVersions`（`frontend/src/hooks/useSolutionVersions.ts`）从后端实时加载；
      - 自定义 Hook `useReviewRecords`（`frontend/src/hooks/useReviewRecords.ts`）当前仅作为与后端评审记录接口的约定占位：在 Mock 模式或未配置后端接口时不会发起实际请求，仅用于在代码层说明后续评审记录接入的调用方式；当前商机管理页面不提供真实评审记录的创建编辑 UI。
      - `useSolutionVersions` 会在当前选中商机变更时，调用 `GET http://localhost:3000/opportunities/:id/solutions` 接口获取该商机下的方案版本列表，并在加载中 / 出错时给出相应的提示文案；
      - “新建方案版本”按钮在真机模式下会调用 `POST http://localhost:3000/opportunities/:id/solutions` 接口创建新版本，创建成功后会直接更新前端列表展示；
      - 方案版本区域同样支持基于后端返回数据的状态筛选与按创建时间的排序，并在列表下方同步展示“评审结果摘要（示例）”，用以在真机模式下保持与 Mock 阶段一致的交互体验；
      - 在方案版本列表中，会基于简单规则为其中一条记录添加“推荐版本（示例）”徽标，并在“评审结果摘要（示例）”中展示“当前推荐版本（示例）”说明：优先选择状态为 `approved` 的版本，若当前商机下尚无已通过版本，则默认以列表中的第一条记录作为推荐版本，该规则仅用于前端演示，后续可由后端返回真实“推荐版本”标识与推荐逻辑替换。

> 建议：当前阶段仍以 Mock 模式为主，待你在本地配置好 MySQL 并确认后端 `/opportunities` 与 `/opportunities/:id/solutions` 接口可用后，再将 `USE_MOCK_OPPORTUNITIES` 切换为 `false`，打通完整的“商机 + 方案版本”前后端链路。

## 任务计划与进度

任务粒度遵循“每次只开发一个功能”的原则，当前规划如下：
- [x] 任务 1：初始化项目结构与技术栈选型落地（前端 Vite + React + TS 脚手架，后端 NestJS + ORM + 数据库连接）。（负责人：Agent + 你，完成日期：2026-03-19，当前进度：前后端脚手架已在本地完成依赖安装与基础运行验证，`/health` 接口与前端首页页面可正常访问，已通过你的验收）
- [x] 任务 2：基础登录与鉴权框架（前端登录页模板 + 后端登录接口与 JWT 鉴权框架雏形）。（负责人：Agent + 你，完成日期：2026-03-19，当前进度：前端登录页模板已实现并接入后端 `/auth/login` 接口，后端已提供基于 JWT 的登录与基础鉴权能力，你已在本地完成前后端联调并验证登录成功及令牌获取流程）
- [ ] 任务 2A：用户认证与团队权限管理一期（真实注册 / 登录 / 当前用户接口 + 团队成员管理基础能力）。（负责人：Agent + 你，确认日期：2026-03-27，当前进度：已完成一期代码落地：后端新增真实 `/auth/register`、`/auth/login`、`/auth/me` 与 `/users` 成员管理接口，引入密码哈希、SQLite 默认本地持久化、系统角色权限模板和默认演示账号；前端登录页已支持注册 / 登录双态，`App` 已改为基于 `/auth/me` 恢复真实登录态，系统设置中的团队与权限管理已接入后端成员列表、新增、编辑、删除与按角色自动生成权限摘要。当前默认演示账号基线已扩展为 `presales_demo / manager_demo / admin_demo / sales_demo / guest_demo` 五类角色，初始化逻辑已改为“缺哪个补哪个”，避免已有本地数据库时新补充角色无法自动落库。已完成后端 `npm test` 与前端 `npm run build` 验证，待你本地启动服务后进一步验收页面与接口联调效果）
- [ ] 任务 2B：菜单权限管理一期（角色默认菜单权限 + 用户菜单权限覆盖）。（负责人：Agent + 你，确认日期：2026-03-27，当前进度：已完成一期代码落地：后端提供菜单权限定义、用户菜单权限查询 / 保存 / 重置接口，并在 `/auth/me` 返回最终菜单集合；前端已在系统设置中新增与流程库同级的“菜单权限管理”页面，仅管理员可见，可按用户维护角色默认菜单、自定义允许、自定义隐藏，主导航已统一按最终菜单权限渲染。已完成前后端 `npm run build` 验证，待你本地启动服务后进一步验收联调效果）
- [ ] 任务 2C：操作权限管理二期（角色默认动作权限 + 用户动作权限覆盖）。（负责人：Agent + 你，确认日期：2026-03-27，当前进度：已完成一期代码落地：后端新增动作权限定义、用户动作权限查询 / 保存 / 重置接口，并在 `/auth/me` 返回角色默认动作权限、自定义允许 / 禁止和最终生效动作集合；前端已在系统设置中新增与“菜单权限管理”并列的“操作权限管理”页面，可按用户可视化勾选动作权限，项目管理、商机管理、解决方案、流程库等高风险入口已切换为按最终动作权限控制。已完成前后端 `npm run build` 验证，待你本地启动服务后进一步验收联调效果）
- [ ] 任务 2D：权限管理页体验优化（按模块分组展示菜单与操作权限）。（负责人：Agent + 你，确认日期：2026-03-27，当前进度：已完成第五轮页面优化：在前序模块折叠、吸顶摘要、覆盖统计与“只看本次变更项”筛选基础上，已将原“菜单权限管理 / 操作权限管理”两个并列菜单入口收口为统一的“权限管理中心”，通过顶部 Tab 切换菜单权限与操作权限，整体信息结构更统一。当前成员选择区与权限矩阵均已升级为“顶部横向单选成员条 + 下方全宽矩阵”结构；系统设置中的“团队管理 / 审批流程库 / 平台品牌与Logo设置 / 图标Logo插件库 / 知识库目录管理”已补充为权限中心可配置项，并进一步细化为设置模块下的独立操作权限。默认角色模板中的删除类动作权限已全面收紧为仅管理员保留高风险删除能力；登录页五类演示账号提示、团队与权限管理说明区、全局布局骨架以及项目管理/商机管理/知识库三页的首轮紧凑化也已同步完成。已在本地运行态 `http://localhost:5173` 使用管理员账号实际验证新布局和说明区均已生效，并完成前后端 `npm run build` 验证，待你本地启动服务后进一步验收页面视觉与交互细节）
- [ ] 任务 3：后端建模与数据库设计（用户、客户、线索、商机、售前项目、方案、评审等核心表结构与实体）。（当前进度：已完成首批核心实体建模与 TypeORM 实体定义，包括用户、客户、线索、商机（商机/售前项目）、方案版本与评审记录，并对评审记录实体的状态字段与前端 `useReviewRecords` 约定做了对齐；在商机实体中补充了 `description` 描述字段以对齐前端商机详情展示；后续将根据业务需要按需补充字段与关联）。（预计完成时间：待定）
- [ ] 任务 4：基础 API 实现（售前项目增删改查、方案版本管理、基础查询列表），并提供 Swagger 接口文档。（当前进度：已完成商机（Opportunity）基础 API 模块的初版实现，支持基于 JWT 鉴权的商机列表查询、详情、创建、更新与删除接口；完成方案版本（SolutionVersion）基础 API，并在后端预留了评审记录 `/solutions/:id/reviews` 读写接口以供后续专门评审视图接入；当前商机管理页面仅在前端通过示例文案演示评审记录效果，不提供真实评审记录的操作入口；其余实体的 API 与前端页面待后续逐步补充）。（预计完成时间：待定）
- [ ] 任务 5：前端项目列表页与项目详情页原型实现，打通基础 API。（预计完成时间：待定）
- [ ] 任务 6：售前工程师工作台视图，实现待办提醒与关键节点列表。（预计完成时间：待定）
- [ ] 任务 7：基础权限与角色控制（简单角色 + 接口鉴权）。（预计完成时间：待定）
- [ ] 任务 8：审批流程库与审批实例基础能力。（当前进度：已确认需求范围与总体设计方案；前端 `SettingsView` 中已有基于 `localStorage` 的流程库 Mock 雏形，支持维护流程名称、目标模块与节点列表，但尚不支持真实后端持久化、节点审批人绑定模型、审批实例生成及“通过 / 驳回”动作落库；后端尚未建立流程定义、节点、审批实例、审批动作等实体与接口。）（预计完成时间：待定）
- [ ] 任务 9：平台上云一期（单机 Docker Compose 部署 + 云服务器联调）。（负责人：Agent + 你，确认日期：2026-03-28，当前进度：已完成首轮可用部署和公网联调；服务器为 `101.43.78.27`、`Ubuntu 22.04`、`2C2G/50GB`，当前按 `Nginx + frontend + backend + MySQL` 的轻量拓扑运行，`http://101.43.78.27/` 可访问前端，`http://101.43.78.27/api/health` 返回 `{\"status\":\"ok\"}`。本期已完成前端 API 基地址环境变量化、后端端口/CORS/JWT/数据库配置环境变量化，并落地 `frontend/Dockerfile`、`backend/Dockerfile`、项目级 `docker-compose.yml`、`frontend/nginx.conf` 与 `.env.example` 模板；云端 MySQL 8.4 启动参数问题与 TypeORM `simple-array` 默认值问题已修正并同步回本地代码，管理员账号 `admin_demo / Admin@123` 登录与访客权限限制也已完成线上验收。最新已进一步确认双斜杠问题根因为云端前端源码未同步到本地修复版本；现已将修复后的 [frontend/src/shared/api.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/api.ts) 同步到服务器、重建 `frontend` 容器，并通过浏览器网络请求复测确认 `GET /api/workflow-definitions` 返回 `200`，原 `GET /api//workflow-definitions` 已消失。当前又已补充完成权限中心线上真链路验收：`PATCH /api/users/4/action-permissions` 保存成功、`POST /api/users/4/action-permissions/reset` 恢复成功；同时以 `sales_demo / Sales@123` 复测角色模板，确认“项目管理”仅保留查看、`+ 新建项目` 与行内 `编辑` 被禁用，“商机管理”保留 `+ 新建商机`，但行内 `审批 / 编辑` 被禁用。另已确认流程库接口读链路正常，但线上当前仍为未种子化空库状态，页面显示 `No data` 属数据缺省而非接口异常。当前已补充沉淀 [docs/release-runbook.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/release-runbook.md) 以及服务器侧 Codex 文档路径，后续进入任务 9 的剩余稳定性验收时，应继续遵循“本地优先开发、云端部署验收、云端应急修复必须回传本地”的流程。）（预计完成时间：待定）
- [ ] 任务 10：飞书 / OpenClaw MVP 接口字段设计与进入开发方案。（负责人：Agent + 你，确认日期：2026-04-03，当前进度：已完成第一版开发设计文档 [docs/feishu-openclaw-interface-design.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/feishu-openclaw-interface-design.md)，并确认本阶段执行口径为“前端优先、后端接口预留”。前端已在系统设置中新增“飞书集成”原型页，现已支持绑定管理、命令预览与卡片预览，并进一步打通“优先请求后端、失败回退本地 Mock”的前端联动层：绑定列表支持关键字搜索与状态筛选，`GET /integrations/feishu/bindings` 加载，新增绑定支持 `POST /integrations/feishu/bindings`，启用/停用支持 `PATCH /integrations/feishu/bindings/:id`；命令页支持调用后端只读示例接口刷新展示，并补齐执行成功 / 失败 / 空结果三类状态区；卡片页支持按当前卡片类型从后端刷新示例，同时新增“页面字段 -> 接口字段”映射表，便于按接口设计文档逐项验收。2026-04-03 已将本地运行中验证通过的飞书集成前端增强同步回独立仓库：补齐绑定列表统计卡、排序、分页，命令区“最近请求信息”，以及卡片区“动作载荷预览”，从而使仓库代码与 `http://localhost:5173` 的当前验收页面保持一致。后端已新增 `backend/src/integrations/feishu` 模块骨架，补齐 `bindings` 管理接口、`me/pending-approvals`、商机摘要、方案摘要、今日简报以及事件 / 卡片回调占位接口；并已进一步新增 `feishu_user_bindings` 实体，将绑定管理从内存种子切换为数据库持久化实现，空表时自动补默认绑定种子。当前又已新增 `feishu_callback_logs` 与 `feishu_message_logs` 两类实体，并将 `POST /integrations/feishu/cards/action` 接到平台现有审批执行服务：已支持按飞书 `open_id` 映射平台用户、对 `approve / reject / open_detail` 动作做最小解析、记录回调日志、记录出站消息结果、执行审批权限校验与真实审批写入；同时已将卡片动作幂等从“仅 processed”收紧为同 `actionToken` 的重复请求统一识别。最新又已补充 `FEISHU_*` 运行配置项、`/integrations/feishu/events` 的 challenge / verification token 基础校验、基于原始 `rawBody` 的回调签名校验，以及过期审批卡片的失效提示处理；并已将审批成功后的返回结构升级为更完整的卡片回写对象，统一包含标题、副标题、摘要、字段、标签和动作集合。2026-04-03 当前已继续补上内部 `card` 视图到飞书 `interactive card` JSON 的映射层，审批成功回调会同时返回平台内部卡片视图与可直接发往飞书的 `interactiveCard`，动作载荷字段已对齐 `approvalInstanceId / businessType / businessId / businessCode / actionToken / requestId` 口径；同时修正了事件回调成功文案中的“签名校验待实现”过期描述。最新又已继续补上真实飞书发送通道的最小实现：后端新增管理员联调接口 `POST /integrations/feishu/messages/approval-cards/send`，支持按 `approvalInstanceId + bindingId/openId` 发送审批卡片，`dryRun=true` 时返回本次发送的卡片预览，关闭 dry-run 后会按官方服务端接口获取 `tenant_access_token` 并调用 `POST /open-apis/im/v1/messages?receive_id_type=open_id` 发送 interactive card；同时已补充 token 内存缓存、根目录 `docker-compose.yml` 的飞书环境变量透传，以及 `runtimeConfig` 对 `FEISHU_* / BACKEND_FEISHU_*` 双口径兼容，避免本地与云上配置命名不一致导致发送链路失效。最新又已将 `im.message.receive_v1` 私聊文本命令链路真正接通：`POST /integrations/feishu/events` 现在会按飞书官方 `message_id` 做消息幂等，校验仅处理 `p2p` 文本消息，并支持白名单命令 `待我审批`、`今日简报`、`商机摘要 OPP-000001`、`方案摘要 SOL-000001`；收到命令后会按飞书绑定映射平台账号，调用现有只读聚合接口生成文本回复，其中“待我审批”还会继续附带前 3 条 interactive approval cards，未绑定账号、非文本消息或非白名单命令则回发明确提示。当前前后端 build 均已在本地仓库通过。另已完成云端后端与前端的一轮发布核验：`presales-backend` 已确认包含 `dist/integrations/feishu`、`messages/approval-cards/send` 路由与 `im.message.receive_v1` 私聊命令处理；`presales-frontend` 也已重建上线，入口位置为“系统设置 -> 飞书集成”。同时已在飞书开放平台定位到正式应用 `claw机器人` 的当前凭据：`App ID=cli_a94bed4806381bd9`、`App Secret=gbocoGB5c1UieiPllB1Ucd7l2VS0aWZQ`、`Verification Token=ntHf9LlkYKYHr4NexGnOIhuxTsmeLhND`。2026-04-04 已继续完成云端 `.env` 写入与服务重启：`/opt/presales-platform/.env` 已补入 `BACKEND_FEISHU_APP_ID / BACKEND_FEISHU_APP_SECRET / BACKEND_FEISHU_VERIFICATION_TOKEN / BACKEND_FEISHU_ENCRYPT_KEY`，并已在飞书开放平台生成并发布新的 `Encrypt Key`：`MttEwq1R8RKbTlL1S0GKlcCTACvap3cO`；`presales-backend` 容器已重建并恢复健康，云端内网 `http://127.0.0.1/api/health` 与公网 `http://101.43.78.27/api/health` 均返回 `{\"status\":\"ok\"}`。同时已补上卡片回调 `challenge` 响应兼容，修复飞书“Challenge code没有返回”导致回调地址保存失败的问题；当前飞书后台“事件与回调”页已显示“当前修改均已发布”，版本 `1.0.1` 已发布通过。2026-04-04 当日晚间又继续完成真实加密回调联调修复：已修正飞书卡片/事件加密回调的 AES 解密与 `sha256(timestamp + nonce + encryptKey + rawBody)` 签名校验实现，放宽时间戳解析以兼容飞书实际 header 格式，并将卡片回调 headers 一并落库；真实私聊“帮助”消息已可稳定回包，真实失败卡片 payload 回放到云端接口已返回 `201` 成功并完成审批写入，证明此前点击“通过/驳回”弹出“出错了，请稍后重试”的根因已解除。为继续做最终验收，已新建审批实例 `17`、推进到“销售领导审批”节点，并向真实飞书账号再次发送新审批卡片（message_id=`om_x100b5227642d48a0c339ea4742fe8ff`）；当前剩余工作聚焦为让用户在这张新卡上完成一次真实点击并确认飞书端卡片状态同步。）
  - OpenClaw 第四阶段补记（确认日期：2026-04-05）：后端已新增 [openclaw.module.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/integrations/openclaw/openclaw.module.ts)、[openclaw.controller.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/integrations/openclaw/openclaw.controller.ts)、[openclaw.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/integrations/openclaw/openclaw.service.ts)，落地 `GET /integrations/openclaw/skills`、`POST /integrations/openclaw/skills/:name`、`POST /integrations/openclaw/query` 三个只读入口；同时补入 `x-openclaw-token` 共享令牌校验、`platformUserId / feishuOpenId` 用户上下文注入与绑定一致性校验、自然语言到 4 个只读 skill 的最小映射，以及针对“审批通过 / 驳回 / 修改 / 删除”等写意图的 `OPENCLAW_READONLY_ONLY` 拦截。[docker-compose.yml](/Users/gjy/Projects-mygetpre/presales-platform/docker-compose.yml)、[.env.example](/Users/gjy/Projects-mygetpre/presales-platform/.env.example) 与 [backend/.env.example](/Users/gjy/Projects-mygetpre/presales-platform/backend/.env.example) 已同步补入 `OPENCLAW_SHARED_TOKEN / BACKEND_OPENCLAW_SHARED_TOKEN` 配置口径；新增 [backend/test/openclaw-service.test.js](/Users/gjy/Projects-mygetpre/presales-platform/backend/test/openclaw-service.test.js) 5 条自动化用例，覆盖绑定用户解析、上下文冲突拒绝、待审批意图识别、商机摘要意图识别和写操作拦截。本地已再次验证通过：`cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build`、`cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm test -- --runInBand`。
  - OpenClaw 云端发布补记（确认日期：2026-04-05）：已通过 `deploy@101.43.78.27` 将本轮最小后端变更包上传到 `/opt/presales-platform`，覆盖 `backend/src/integrations/openclaw/*`、`backend/src/app.module.ts`、`backend/src/config/runtime.ts` 与 `docker-compose.yml`，并在云端 `.env` 中新增 `BACKEND_OPENCLAW_SHARED_TOKEN` 实值后完成 `docker compose build backend && docker compose up -d backend`。发布后已完成最小验收：`curl http://127.0.0.1/api/health` 返回 `{\"status\":\"ok\"}`；`GET /api/integrations/openclaw/skills` 可返回 4 个只读 skill；`POST /api/integrations/openclaw/query` 以 `platformUserId=2`、查询“我今天有哪些待审批”返回成功，意图识别为 `get_my_pending_approvals`。这表明云端 OpenClaw 只读后端入口已具备真实联调条件，下一步可直接接真实 OpenClaw 侧配置，不需要再重复部署后端骨架。
  - OpenClaw 本机配置补记（确认日期：2026-04-05）：已在本机 `~/.openclaw` 下完成一层真实 skill 包装，新增本地 skill [SKILL.md](/Users/gjy/.openclaw/skills/presales-platform-openclaw/SKILL.md)、脚本 [presales-platform-openclaw.sh](/Users/gjy/.openclaw/skills/presales-platform-openclaw/scripts/presales-platform-openclaw.sh) 与私有 env 文件 `~/.openclaw/workspace/.openclaw/presales-platform-api.env`。当前 OpenClaw 可通过该 skill 直接调用平台 `http://101.43.78.27/api/integrations/openclaw/*`，并自动带上 `x-openclaw-token`；本机已完成两条真实验证：`bash ~/.openclaw/skills/presales-platform-openclaw/scripts/presales-platform-openclaw.sh skills` 可返回 4 个只读 skill，`bash ~/.openclaw/skills/presales-platform-openclaw/scripts/presales-platform-openclaw.sh query 2 '我今天有哪些待审批'` 可返回成功结果。至此，本机 OpenClaw 与云端平台只读接口都已打通，下一步可直接在真实对话中使用该 skill，而不需要再手工配置 header/token。
  - OpenClaw 真实会话验证补记（确认日期：2026-04-05）：已在本机直接通过 `openclaw agent` 对现有主会话 `7af4c7a1-88ae-4176-b2cb-6f1919bb86b5` 完成 4 类自然语言查询的真实联调验证，分别覆盖“我今天有哪些待审批”“给我今日简报”“看下商机摘要 OPP-000001”“看下方案摘要 SOL-000001”。实际返回结果已确认可读到平台真实数据：`manager_demo / platformUserId=2` 当前待审批为 `0`，今日简报返回 `12` 条负责或关注商机、`4` 条风险商机、`10` 个最近更新方案，商机与方案摘要也均返回成功。联调中同时确认两点当前限制：1）OpenClaw 主会话不适合并发压测，多条 `openclaw agent` 并发请求会触发 `session file locked`，后续联调需保持串行；2）商机摘要与方案摘要的专用摘要路径仍存在参数兼容问题，agent 当前会自动回退到通用查询，因此用户侧虽然能拿到正确结果，但回复中会出现“改走通用查询 / 重试”的过程话术。另已确认 `openclaw gateway probe` 在当前 Codex 沙箱内会误报 `EPERM 127.0.0.1:18789`，提权后 `openclaw gateway health` 与 `openclaw gateway status` 均正常，说明这不是 OpenClaw 服务故障，而是本地沙箱对 loopback WebSocket 的限制。
  - OpenClaw 摘要兼容修复补记（确认日期：2026-04-05）：已继续定位并修复商机/方案摘要专用 skill 的参数兼容问题。根因是本地 OpenClaw skill 脚本调用 `POST /integrations/openclaw/skills/:name` 时，将 `code / limit / businessType` 放在顶层 body，而后端 `executeSkill()` 早前只读取 `payload.input`，导致 `get_opportunity_summary / get_solution_summary` 直调会报“缺少 OPP/SOL 编号”，真实 agent 因而回退到通用查询。当前已在 [openclaw.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/integrations/openclaw/openclaw.service.ts) 增加兼容归一化层，统一兼容顶层 `code / businessCode / opportunityCode / solutionCode / limit / businessType` 与嵌套 `input.*` 两种口径；并在 [backend/test/openclaw-service.test.js](/Users/gjy/Projects-mygetpre/presales-platform/backend/test/openclaw-service.test.js) 新增两条回归用例，覆盖“顶层 `code` 直调商机摘要”和“顶层 `limit/businessType` 直调待审批”。本地已再次验证通过：`cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build`、`cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm test -- --runInBand`；云端也已按最小范围覆盖 [openclaw.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/integrations/openclaw/openclaw.service.ts) 并重建 `backend` 容器，随后用内网接口直调验证 `POST /api/integrations/openclaw/skills/get_opportunity_summary` 和 `POST /api/integrations/openclaw/skills/get_solution_summary` 均已返回成功。修复后再次通过真实 `openclaw agent` 会话复测“看下商机摘要 OPP-000001”，回复中已不再出现“改走通用查询 / 重试”的过程话术，说明用户可见链路已恢复到专用摘要路径。
  - OpenClaw 回复文案收口补记（确认日期：2026-04-05）：已继续收紧本机本地 skill [SKILL.md](/Users/gjy/.openclaw/skills/presales-platform-openclaw/SKILL.md) 的输出约束，新增“查询成功时尽量只输出 1 条最终答复”“禁止使用 `我查一下 / 我拉一下 / 我先帮你` 这类过程开场”“首句直接进入 `今日简报 / 商机摘要 / 方案摘要` 结果本身”等规则。最新通过真实 `openclaw agent` 新会话复测两条口径：1）“给我今日简报”当前已稳定返回单条结果式回复，以 `今日简报：` 开头，不再拆成“过程消息 + 结果消息”；2）“看下方案摘要 SOL-000001”当前已稳定返回以 `` `SOL-000001` 方案摘要如下：`` 开头的直接结果式摘要。现阶段可认为 OpenClaw 本地回复风格已基本收口；若后续仍偶发残留一两句过程话术，应优先从本机 workspace prompt 或模型会话历史继续细调，而不是再回头排查平台后端接口。
  - 自动化测试补记（确认日期：2026-04-05）：已新增 [backend/test/feishu-service.test.js](/Users/gjy/Projects-mygetpre/presales-platform/backend/test/feishu-service.test.js)，当前已覆盖 7 组高风险场景：1）事件 challenge 响应；2）事件 token 校验失败；3）过期审批卡片返回 stale warning + `raw` 卡片；4）当前节点非本人处理人时返回 forbidden warning + 禁用卡片；5）审批成功后返回 `card: { type: "raw", data: ... }` 的 JSON 2.0 回包结构；6）重复 `actionToken` 点击返回 duplicate warning；7）`open_detail` 分支仅返回 success toast、不触发审批写操作。当前本地 `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build` 与 `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm test -- --runInBand` 已再次通过，说明飞书回调主链路已具备第二轮自动化回归保护。
  - 飞书卡片 2.0 结构补记（确认日期：2026-04-05）：已依据飞书官方 `card.action.trigger` 文档，将卡片回调响应从旧的裸 `config/header/elements` 结构切换为 `card: { type: "raw", data: <JSON 2.0 card> }`，并同步将消息发送卡片迁移到 JSON 2.0。联调中又进一步确认并修复两个 JSON 2.0 不兼容点：`note` 标签已改写为普通文本 `div + lark_md`，旧版交互容器 `tag: "action"` 已改为直接在 `body.elements` 中放置 `button`，并按官方 `behaviors` 语义分别输出 `callback` / `open_url`。本地 `npm run build`、`npm test -- --runInBand` 已再次通过，云端 `presales-backend` 已重建。当前真实发卡链路已恢复可用：对审批实例 `20` 发送的新卡消息 `om_x100b5229fbaf88a0c3d8af5b68cf400` 已出现在飞书 Web 会话中，最新卡面可正确展示“最终审批”且按钮禁用状态生效；剩余未完全收口的问题是，自动化浏览器点击旧卡片按钮未触发新的飞书回调日志，疑似飞书 Web 对自动化事件有限制，因此下次会话应优先基于人工点击继续验证“旧卡 stale 回刷”和“新卡真实回调”两个场景。
  - 飞书旧卡兼容补记（确认日期：2026-04-05）：你已手工复测“旧卡仍可点”的场景，现象已按预期从“飘红报错”收口为“warning 提示 + 卡片禁用回刷”。云端最新日志显示 `feishu_callback_logs.id=85` 已从此前的 `failed` 切换为 `ignored`，且不再带错误信息；对应出站消息 `feishu_message_logs.id=90` 的模板为 `card_action_forbidden`，说明后端已在真正执行审批前完成“当前用户是否仍可处理当前节点”的预判，并将旧卡回刷为只读禁用态，而不是继续抛出 `只有当前节点处理人可以执行此审批动作` 给飞书客户端。
  - 飞书最终审批联调补记（确认日期：2026-04-05）：进一步核对云端流程规则后，当前所有尚未结束的方案实例（`16/19/20/21`）都已处于“最终审批”节点，节点审批人规则统一为 `admin`；而你的飞书账号原先绑定的是 `manager_demo`，这也是旧卡在当前阶段继续点击会被平台拒绝的直接原因。为继续收口真正可操作的新卡场景，已将联调绑定临时调整为 `admin_demo`，并重新向实例 `20` 发送最新审批卡，消息 ID 为 `om_x100b52155db550a0c35b78d6b2c1599`。下一次会话应直接从“点击这张最新 `SOL-000006` 最终审批卡，确认成功回调时是否仍会飘红”继续，不再重复排查旧卡权限问题。
  - 飞书最终验收补记（确认日期：2026-04-05）：你已手工点击最新 `SOL-000006` 最终审批卡的“通过”，飞书前端表现为“点击后提示成功，按钮立即标灰”。云端最新记录与此完全一致：`feishu_callback_logs.id=86` 为 `processed`，`approval_instances.id=20` 已从 `in_progress` 变为 `approved`、`currentNodeId=NULL`，对应回写消息 `feishu_message_logs.id=92` 模板为 `card_action_approve` 且 `sendStatus=sent`。这表明当前飞书联调已同时打通三类关键场景：1）机器人私聊命令可回包；2）旧卡误点会返回 `warning + 禁用回刷`，不再飘红；3）当前真正可操作的新卡在人工点击后可成功执行审批并回写禁用态。下次会话如需继续推进，应从“是否恢复该飞书绑定回 `manager_demo`、以及是否补一轮自动化/文档化收尾”继续，而不是再回到回调格式或审批链路排查。
  - 飞书绑定恢复补记（确认日期：2026-04-05）：在完成 `admin_demo` 口径下的最终审批联调后，已将你的飞书绑定从临时联调态恢复回日常使用口径：`feishu_user_bindings.id=1` 当前已重新绑定 `platformUserId=2 / platformUsername=manager_demo / department=售前管理部 / status=active`。这一步只影响后续私聊命令与待审批卡片的身份映射，不影响已完成的 `SOL-000006` 审批验收结果；下次如果仍需复测“最终审批”节点，应再次显式切到 `admin` 口径或准备一条当前节点审批人为经理的新实例。
  - 飞书联调补记（确认日期：2026-04-05）：当前云端联调已确认“平台业务闭环已通，但飞书客户端仍对卡片动作回调报错”。具体到真实实例 `17`：已先后修复加密回调解密、签名算法与完整时间串时间戳解析问题；真实私聊 `帮助` 命令持续返回成功，说明机器人事件链路正常。联调过程中又进一步确认两个关键事实：其一，先前多次“点击即报错”中有一部分并非回调失效，而是卡片按钮与当前节点能力不一致，例如实例 `17` 在 `assignment` 节点时，后端真实允许动作为 `assign`，但飞书卡片仍错误渲染了 `approve/reject`，对应失败原因为“当前节点不支持该操作”；其二，在将实例 `17` 推进到最终 `approval` 节点后，飞书卡片上的 `通过` 已经真实执行成功，云端最新记录显示 `feishu_callback_logs.id=48` 为 `processed`，`approval_instances.id=17` 已变为 `approved`，节点 `88-93` 全部为 `approved`，同时对应的回写卡片消息也已发送成功。当前尚未收口的唯一问题是：飞书客户端在动作已成功执行后，仍然展示“出错了，请稍后重试”，因此下一次会话应直接从“收敛 `POST /integrations/feishu/cards/action` 的回调返回体到飞书更保守的兼容格式，只保留其明确接受的字段”继续，而不再重复排查签名、解密、权限绑定或审批落库链路。
  - 补充收口（确认日期：2026-03-29）：本轮继续处理线上易用性与真库验收，包括团队管理表格补齐“序号 / 列设置 / 分页”，个人资料中的“团队角色”改为下拉选择，工作台“最近项目”默认每页 5 条且可调，“本月业绩趋势”中部图例与柱图区继续收紧并居中；后端补充轻量 MySQL 烟测脚本，通过真实接口完成“登录 -> 当前用户 -> 创建成员 -> 更新成员 -> 检索成员 -> 删除成员”的自动验证，确保云上真实 MySQL 链路可重复验收。
  - 补充收口（确认日期：2026-03-29）：继续优化工作台与数据分析联动体验。工作台“本月业绩趋势”中部图例需改为左侧上下堆叠，靠左贴边但整体在中间卡片内横向居中；点击跳转到“数据分析 > 业绩趋势”后，需优先读取后端真实 MySQL 商机数据，并补充可重复执行的趋势种子脚本，将示例分析数据直接写入数据库，确保每次跳转都能看到非空趋势图。
  - 补充需求（确认日期：2026-04-01）：云服务器当前已具备域名 `www.getpre.cn` 与现成免费证书，证书目录为 `/opt/presales-platform/getpre.cn_nginx`。本轮新增“域名 HTTPS 接入”收口项，实施口径固定为在现有 `frontend` 容器内 Nginx 直接终止 TLS，通过 `80 -> 443` 强制跳转、`443` 提供静态站点与 `/api/` 反向代理，不新增第二层反向代理；上线前需完成 DNS 解析、云安全组 `80/443` 放通、证书挂载、Nginx SSL 配置、后端 `CORS_ORIGIN` 调整，以及基于 `curl` 与浏览器的 HTTPS 验收。
  - 当前状态更新（确认日期：2026-04-01）：经本轮确认，`www.getpre.cn` 当前仍在备案中，因此暂不在服务器执行 HTTPS 切换；本次仅完成任务清单与实施方案文档整理，作为备案完成后的执行基线。具体待办、配置改造思路、上线步骤、验收口径与回退策略统一见 [docs/https-rollout-plan.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/https-rollout-plan.md)。
  - 前端验收补记（确认日期：2026-04-01）：继续排查商机流程页数据来源后，已确认“商机审批流程定义”此前仍主要依赖前端本地流程模板与 localStorage。现已将 [frontend/src/views/OpportunitiesDemoView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/OpportunitiesDemoView.tsx) 调整为优先读取后端 `GET /workflow-definitions?targetType=opportunity&enabled=true` 的真实流程定义，并沿用“适用商机关键词优先，其次默认流程”的匹配规则；当后端流程库不可用时才回退到本地模板。同时在页面上明确标注当前流程来源与降级提示。当前审批动作与审批记录仍为前端占位数据，待后端补齐审批实例/审批动作接口后再继续改造成完整真实链路。
  - 前端验收补记（确认日期：2026-04-01）：已继续修正商机/方案/权限中心三处前端问题。其一，[frontend/src/views/OpportunitiesDemoView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/OpportunitiesDemoView.tsx) 中“分配解决方案负责人”节点不再错误使用销售负责人字段兜底，避免出现流程未走到第 4 步但第 4 步色块提前点亮的情况；同时 [frontend/src/shared/opportunityDemoData.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/opportunityDemoData.ts) 已去除基于后置字段自动补前置审批通过状态的宽松推导，改为以显式流程记录/显式字段为准，收紧步骤条与审批记录的一致性。其二，[frontend/src/views/SolutionsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/SolutionsView.tsx) 已将原静态“方案审批流程”模态框调整为带当前节点说明、节点责任人标识和只读/可操作约束的动态前端规则：当前仅允许待处理节点责任人执行通过/驳回，其他成员保持只读查看；该页仍属前端规则层收口，尚未接入真实审批实例接口。其三，[frontend/src/views/SettingsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/SettingsView.tsx) 已为权限管理中心补充真实数字用户 ID 校验，避免页面刚打开时拿本地快照中的 `username` 去调用 `/users/:id/menu-permissions`、`/users/:id/action-permissions`，从而触发后端 `ParseIntPipe` 返回 `400`。
  - 前端修复补记（确认日期：2026-04-01）：针对你反馈的“点击权限管理中心仍报用户菜单权限加载失败：400”，已继续在 [frontend/src/views/SettingsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/SettingsView.tsx) 做第二轮收口：权限中心成员条现已改为仅展示后端返回的真实数字用户 ID 成员，不再把本地快照成员带入单选区；当团队列表回退到本地快照时，页面会直接提示“需连接后端真实用户数据后才能维护权限”，并同步清空当前选中成员与草稿状态；菜单权限/操作权限的“全部允许、清空覆盖、恢复角色默认、保存”按钮也已统一改为基于 `isNumericUserId` 的二次校验。这样即使成员列表处于本地降级态，也不会再向 `/users/:id/menu-permissions`、`/users/:id/action-permissions` 发送带 `username` 的非法请求。
  - 浏览器验收补记（确认日期：2026-04-01）：已在本地启动 `frontend preview + backend` 后，对最新改动做一轮真实浏览器复测。结果如下：1）“系统设置 > 权限管理中心”打开后，网络请求已变为 `GET /users/3/menu-permissions 200`，未再出现原 `400`；2）以管理员账号进入“解决方案 > 工业互联网平台升级项目解决方案 > 审批”时，当前节点显示为“商务评审”，页面明确提示“当前节点待经理处理”，通过/驳回按钮置灰；切换为经理账号后复测，同一节点下通过/驳回按钮恢复可用，说明节点责任人约束已生效；3）商机审批流程方面，`OPP-000004` 驳回场景下步骤条与“当前流程已驳回，后续节点仅支持查看”提示能够对齐，但 `OPP-000003` 本地数据仍存在“销售领导审批待审批、解决方案领导审批已通过、分配负责人已完成”的旧脏链路，说明仅靠当前字段收紧还未完全清理既有持久化样例数据，后续需继续补一轮本地 `workflowRecords` 迁移/重建逻辑。
  - 前端迁移补记（确认日期：2026-04-01）：已继续在 [frontend/src/shared/opportunityDemoData.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/opportunityDemoData.ts) 中补齐商机审批缓存迁移逻辑：将 `sharedDemoOpportunitiesVersion` 从 `2` 升级到 `3`，对旧版本地缓存强制重建 `workflowRecords`；重建规则改为按节点顺序生成连续流程记录，并在销售领导驳回或解决方案领导驳回时截断后续节点，避免再出现“前序待审批、后序已完成”的历史脏链路。同时，最终用于页面展示的流程字段改为先清空再根据重建后的有效记录回填，使步骤条、节点状态与审批记录以同一套流程记录为真源。浏览器再次复测 `OPP-000003` 后，当前链路已修正为“线索确认 -> 销售领导审批通过 -> 解决方案领导审批通过 -> 分配解决方案负责人 -> 需求分析待上传”，不再出现旧的错位审批记录。
  - 前端验收补记（确认日期：2026-04-01）：已继续完成一轮控制台与表单可用性收口。当前已在 [frontend/index.html](/Users/gjy/Projects-mygetpre/presales-platform/frontend/index.html) 中补充内联 `favicon`，消除页面首次加载时的静态资源 `404`；同时在 [frontend/src/views/LoginView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/LoginView.tsx)、[frontend/src/views/SettingsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/SettingsView.tsx)、[frontend/src/views/KnowledgeView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/KnowledgeView.tsx) 中为登录、密码修改、成员密码、平台名称及隐藏文件上传控件补齐 `name` / `autocomplete` 等表单属性，并保留 Ant Design 自身生成的字段 `id`，避免再次触发 `label for` 错配。最新浏览器复测下，工作台与系统设置页面控制台均已无 `favicon 404`、`autocomplete`、`id/name` 或 `label for` 相关告警。
  - 前端回归补记（确认日期：2026-04-01）：已继续对商机审批页做指定单据回归。`OPP-000004` 驳回场景下，“解决方案领导审批”显示驳回且第 4 至第 6 节点保持只读查看；`OPP-000007` 当前停在“需求分析待处理”，第 4 步负责人已完成但第 6 步最终审批未提前点亮；`OPP-000009` 已完整闭环，线索确认、双审批、负责人分配、需求分析、最终审批与审批记录顺序一致，未再出现步骤条和历史记录错位。
  - 后端审批链路补记（确认日期：2026-04-01）：已新增 [backend/src/approvals/approvals.module.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/approvals/approvals.module.ts)、[backend/src/approvals/approvals.controller.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/approvals/approvals.controller.ts)、[backend/src/approvals/approvals.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/approvals/approvals.service.ts)，打通真实审批实例基础能力：支持按业务对象启动审批实例、查询当前/指定审批实例，以及执行节点动作（`approve / reject / upload / assign / submit`）。同时已在 [backend/src/domain/entities/workflow-node.entity.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/domain/entities/workflow-node.entity.ts) 和 [backend/src/workflows/workflows.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/workflows/workflows.service.ts) 中补齐后端流程节点的 `nodeType / fieldKey / fieldLabel / actionButtonLabel` 字段，并增加默认机会流/方案流种子与“按 code 自修复”逻辑，避免空壳流程定义。为支撑真实商机流转，[backend/src/domain/entities/opportunity.entity.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/domain/entities/opportunity.entity.ts) 已补齐 `bizApprovalStatus / techApprovalStatus / requirementBriefDocName / researchDocName / solutionOwnerUsername / approvalOpinion` 等审批链字段；[backend/src/solution-versions/solution-versions.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/solution-versions/solution-versions.service.ts) 也已在创建方案版本时记录 `createdBy`，为后续方案审批责任人判定做准备。
  - 后端烟测补记（确认日期：2026-04-01）：已在临时端口 `3001` 上启动修复后的本地后端做审批接口烟测。实际验证链路为：`manager_demo` 登录 -> 创建“审批烟测商机-2” -> 启动 `/approval-instances/start` -> 以 `sales_demo` 执行首节点 `upload` -> 以 `manager_demo` 执行第二节点 `approve`。结果显示：1）实例启动后当前节点正确落在“线索确认”，销售账号 `canCurrentUserHandleCurrentNode=true`；2）上传需求说明后实例自动流转到“销售领导审批”；3）经理审批通过后实例继续流转到“解决方案领导审批”，动作历史中已记录 `upload` 与 `approve` 两条真实审批动作。当前前端页面尚未切换到这些新接口，商机/方案审批 UI 仍以前端占位链路为主，下一步需继续做前端对接。
  - 前端审批对接补记（确认日期：2026-04-01）：已继续在 [frontend/src/shared/approvalInstances.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/approvalInstances.ts)、[frontend/src/views/OpportunitiesDemoView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/OpportunitiesDemoView.tsx)、[frontend/src/views/SolutionsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/SolutionsView.tsx)、[frontend/src/shared/pipelineMock.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/pipelineMock.ts) 中接入真实审批实例前端适配层。当前商机审批会优先调用 `GET /approval-instances/current` 与 `POST /approval-instances/start` 获取真实实例，方案审批会优先按商机关联方案版本解析真实 `solutionVersionId` 后再尝试接入真实实例；若本地后端未提供对应接口或真实方案版本尚未就绪，则页面会明确提示并回退到现有前端演示链路，而不是静默失败。
  - 权限中心验收补记（确认日期：2026-04-01）：已再次针对你反馈的“点击权限管理中心仍报用户菜单权限加载失败：400”做真实浏览器复核。在当前本地运行态 `http://127.0.0.1:4173` 下，已确认“菜单权限”与“操作权限”初始加载分别命中 `GET /users/3/menu-permissions 200/304`、`GET /users/4/action-permissions 200`，未再复现 `400`；同时已实际验证 `sales_demo` 的两条保存/重置链路：1）操作权限页临时放开 `project.create` 后，`PATCH /users/4/action-permissions 200`，随后 `POST /users/4/action-permissions/reset 201`；2）菜单权限页临时放开 `menu.analytics` 后，`PATCH /users/4/menu-permissions 200`，随后 `POST /users/4/menu-permissions/reset 201`。结合本轮重新执行的 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && ./node_modules/.bin/vite build` 已通过，当前判断你此前看到的 `400` 更可能来自旧预览包或旧页面缓存，而不是现源码路径仍在向 `/users/:id/...` 发送非法 `username` 参数。

每完成一个任务：
- 完成代码与测试；
- 通过你的验收；
- 在此勾选并更新完成时间或备注。
 
## 最近一次会话进度记录

- 会话日期：2026-03-29
- 当前处理的任务：任务 9 收口，重点完成云服务器首轮部署验收、服务器侧 Codex 安装约定落盘，以及本地/云端协同工作流文档化。
- 本次会话新增内容（部署、联调与文档为主）：
  - 已完成云服务器首轮部署问题排查，确认并修正 `mysql:8.4` 不再接受 `default-authentication-plugin=mysql_native_password` 的兼容性问题。
  - 已修正后端用户实体中 `simple-array` 字段在 MySQL 8.4 下映射为 `TEXT` 且不能设置默认值的问题，并将相应修改同步回本地代码。
  - 已修正前端接口路径 `/api//workflow-definitions` 双斜杠问题，并同步回本地代码。
  - 已确认云服务器当前运行状态：`mysql / backend / frontend` 三个容器可正常启动，`http://101.43.78.27/` 可访问前端，`http://101.43.78.27/api/health` 返回正常。
  - 已完成线上基础验收：管理员账号 `admin_demo / Admin@123` 登录通过，访客权限限制符合预期。
  - 已确认服务器侧账户分工继续采用 `deploy / claw / root` 三类账户，不新增第四个 `codex` 用户；其中 `deploy` 负责平台部署与 Codex CLI，`claw` 仅负责既有 `openclaw`，`root` 仅保留系统级安装与应急维护。
  - 已在云服务器 `deploy` 用户下安装 Codex CLI，命令路径为 `/home/deploy/.npm-global/bin/codex`，版本为 `codex-cli 0.117.0`，配置目录为 `/home/deploy/.codex`。
  - 已继续完成任务 9 的线上验收补测：确认工作台“本月业绩趋势”中部图例当前为左侧上下堆叠，线上数据为“本月新增商机金额 6530 万 / 本月签约金额 2180 万”；同时通过数据库种子数据校验“数据分析 > 业绩趋势”可稳定展示 `10月 380万 / 11月 520万 / 12月 460万 / 1月 610万 / 2月 570万 / 3月 680万`。
  - 已补测主题切换运行态，确认线上 `appThemeMode`、`document.documentElement.dataset.theme` 与 `.app-shell[data-theme]` 可在 `light / dark` 间正确同步切换；当前主题状态持久化链路正常，可继续进入后续视觉细节验收。
  - 已完成数据分析页本轮收口：`AnalyticsView` 中“业绩趋势”已由纯数字占位改为带折线、面积、柱体和月份数据卡的可视化趋势图，默认进入页面即可看到有数据的真实 MySQL 趋势展示；“销售漏斗”和“业绩趋势”两张卡片线上实测高度均为 `465px`，已保持一致；默认入口“标准销售仪表盘”已固定保留，管理员也不能删除。
  - 已完成数据分析页第二轮收口：销售漏斗改为更稳的横向图表布局并补齐 5 个阶段摘要卡，线上已确认标签、条形和数值不再互相遮挡；行业分布已切换为可悬停提示的饼环图；项目进度区域已替换为左侧名称固定、右侧阶段窗口展示的图表式甘特布局，避免进度条压住项目名称。线上当前四张分析图卡高度一致，均为 `465px`。
  - 已完成团队管理操作列与禁用登录链路收口：团队管理表格现已提供 `查看 / 编辑 / 禁用(启用) / 删除` 四类操作；编辑成员弹窗已补 `随机生成密码` 按钮，并会回显当前生成结果。线上已通过真实接口验证 `guest_demo` 账号在被禁用后登录返回 `401`，提示文案为“你的账号已经被禁止登陆”，随后已恢复该账号为启用状态，未遗留脏数据。
  - 本轮进入下一阶段收口：继续处理数据分析页深色模式下仪表盘内部组件白底问题，并将金融经营仪表盘、制造推进仪表盘统一补齐为 4 组件布局；同时补齐平台所有删除按钮的二次确认弹框，覆盖项目管理、商机管理、知识库、数据分析以及系统设置中的知识库目录/流程节点等删除入口。
  - 已完成本轮云端验收：前端单容器发布后，线上 `http://101.43.78.27/` 深色模式下的数据分析页标准销售仪表盘、金融经营仪表盘、制造推进仪表盘均已确认内部组件改为深色面板，无白底残留；其中金融经营仪表盘、制造推进仪表盘均已补齐为 4 组件布局。删除交互方面，已在线逐项抽检并确认弹框生效：数据分析“删除当前仪表盘”、项目管理项目删除、商机管理商机删除、知识库文档删除、系统设置中知识库目录一级分类删除、子分类删除、审批流程节点删除均会先弹二次确认框，再允许执行删除。
  - 已完成删除入口扩展巡检：继续在线验证团队管理成员删除与知识库上传弹窗中的“待上传文件删除”，两处均已确认弹出二次确认框；同时在系统设置“审批流程库”中恢复默认模板后复测节点删除，确认真实线上空库场景与恢复模板后的编辑场景都可正常覆盖本轮验收口径。
  - 已完成深色模式关键弹窗视觉回归：在线复查知识库上传弹窗、团队管理删除确认框、审批流程编辑弹窗与流程节点删除确认框，当前均未发现白底残留、白边压阴影或输入框内层额外长方形描边问题；知识库上传弹窗中的待上传文件卡片、分类下拉框和底部操作区在深色模式下视觉表现正常。
  - 已完成团队管理 `401` 回退修复的线上验收：管理员正常登录进入“系统设置 > 团队管理”时，页面展示真实后端 5 个成员（`admin_demo / guest_demo / sales_demo / presales_demo / manager_demo`）；随后手动将浏览器 `accessToken` 改为无效值并重新进入团队管理，`GET /api/users` 返回 `401` 后，成员表格不再回退显示旧的本地中文 Mock 列表，而是清空为 `No data` 并提示“团队成员登录态已失效，请重新登录后再加载真实成员数据。”，确认本轮修复已在线生效。
  - 已完成注册功能线上修复与复测：确认根因是前端注册页此前仅保留“姓名 + 账号/企业邮箱 + 密码”三项输入，但后端 `/api/auth/register` 仍强制要求独立 `email` 字段，导致用户以普通账号注册时返回“用户名、邮箱和密码不能为空”。现已在注册态补回独立“企业邮箱”输入，并修正前端提交 payload；完成前端单容器最小发布后，线上 `http://101.43.78.27/` 已可使用 `reg_20260330_1 / reg_20260330_1@example.com / RegTest@123` 成功注册并立即登录，原报错未再复现。
  - 已新增本地/云端协同约定文档 [docs/release-runbook.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/release-runbook.md)，并已复制到云服务器 `/opt/presales-platform/docs/release-runbook.md`。
  - 已将服务器侧 Codex 约定源文档 [docs/cloud-server-codex-AGENTS.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/cloud-server-codex-AGENTS.md) 与 [docs/cloud-server-codex-SERVER_CONVENTIONS.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/cloud-server-codex-SERVER_CONVENTIONS.md) 的本地/云端路径同步写入 `README.md`。
  - 已继续推进任务 9 收口：团队管理页新增表格序号列、列设置和分页；个人资料与成员编辑中的“团队角色”统一改为下拉框；工作台“最近项目”默认每页 5 条，分页档位调整为 `5/10/15/20`；“本月业绩趋势”中部图例改为居中布局并进一步压缩柱图区，降低线上溢出风险。
  - 已新增 [backend/scripts/mysql-smoke-test.mjs](/Users/gjy/Projects-mygetpre/presales-platform/backend/scripts/mysql-smoke-test.mjs) 以及 `npm run test:mysql-smoke` 命令，用于在云服务器通过真实 MySQL 与现网接口做轻量自动验收；脚本使用管理员账号登录，创建临时成员、更新成员、校验 `/auth/me` 与 `/users/me`、关键字检索后再自动删除，尽量不污染线上数据。
  - 已完成云端二次验收：前端新版本已重建并启动；云服务器执行 `cd /opt/presales-platform/backend && npm run test:mysql-smoke` 已通过，输出基线为 `apiBaseUrl=http://127.0.0.1/api`、`adminUsername=admin_demo`、`initialUserCount=5`，确认真实 MySQL 下的登录、当前用户、成员创建、成员更新、关键字检索与删除链路可用。
  - 已继续完成工作台与数据分析联动收口：工作台“本月业绩趋势”中部图例已调整为左侧上下堆叠，整体不再压住柱图区；数据分析页已改为优先读取后端真实商机数据，并新增 [backend/scripts/seed-analytics-opportunities.mjs](/Users/gjy/Projects-mygetpre/presales-platform/backend/scripts/seed-analytics-opportunities.mjs) 与 `npm run seed:analytics-mock` 命令，将 6 条分析趋势种子直接写入 MySQL。
  - 已修正 [frontend/src/shared/analyticsSync.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/analyticsSync.ts) 中“签约金额先格式化再解析导致全部归零”的旧问题；当前线上已复验通过：工作台“本月签约金额”显示 `2180万`，数据分析页“业绩趋势”显示 `10月 380万 / 11月 520万 / 12月 460万 / 1月 610万 / 2月 570万 / 3月 680万`，可稳定从真实 MySQL 种子数据生成页面。
  - 已完成权限管理中心线上真实保存/重置验收：管理员在“操作权限”页对 `sales_demo` 临时放开 `project.create` 后，`PATCH /api/users/4/action-permissions` 返回 `200`，随后执行“恢复角色默认”，`POST /api/users/4/action-permissions/reset` 返回 `201`，页面提示均正常。
  - 已完成 `sales_demo / Sales@123` 角色模板线上复测：左侧菜单保留工作台、项目管理、商机管理、解决方案、知识库、系统设置；其中项目页 `+ 新建项目` 和行内 `编辑` 禁用，商机页保留 `+ 新建商机`，但行内 `审批 / 编辑` 禁用，符合销售角色“可建商机、只读项目”的预期。
  - 已确认审批流程库线上读接口已恢复正常，`GET /api/workflow-definitions` 返回 `200`；当前页面显示 `No data` 的原因是线上尚无流程定义种子数据，而非接口或前端路由异常。
  - 已新增并确认本轮收口需求：云上继续固定真实 MySQL 口径，本地暂保留 `SQLite / MySQL` 双入口；同时新增工作台趋势卡片溢出、深色模式卡片白边/阴影冲突、输入框双层长方形描边、重复登录成功提示等 4 项 UI 修复要求。
  - 已确认后续实施原则：继续保持云服务器 `2C2G` 低资源约束，不新增重型组件，不做高风险全量重建；上线时优先采用“本地修复 -> 最小验证 -> 云端最小重建”的流程。
  - 已完成本地第一轮实现：保留后端 `SQLite / MySQL` 双入口不变，但将云上 MySQL 真实库继续作为唯一正式部署口径写回文档；前端已统一收敛全局卡片阴影与输入控件样式，去掉登录成功重复提示，并补修工作台“本月业绩趋势”顶部统计块的响应式布局。
  - 已将工作台、项目管理、商机管理、解决方案、投标管理、合同管理、知识库、数据分析、系统设置中共用的卡片阴影从“描边 + 阴影”改为“保留边框 + 单层阴影”，降低深色模式下白边被阴影覆盖的视觉冲突；同时为 `Input / Password / Search / Select / DatePicker` 增加内层去边框处理，避免出现“外框里再套一层长方形格子”的效果。
  - 已完成云端最小发布：仅同步前端相关源码并重建 `frontend` 容器，未重建 MySQL，`backend` 仅保持运行依赖检查通过，符合 `2C2G` 服务器“最小变更、最小重启”原则。
  - 已根据验收反馈继续开始第二轮精修：移除系统设置菜单切换的提示消息，将卡片边框改为独立描边层以避免阴影覆盖白边，并继续压缩工作台“本月业绩趋势”的中部图例、柱图与底部摘要区高度。
- 本次会话验证结果：
  - 云服务器 `curl http://127.0.0.1/api/health` 返回正常。
  - 云服务器 `curl http://101.43.78.27/api/health` 返回正常。
  - 云服务器首页可返回前端入口 HTML。
  - 浏览器线上验收确认管理员、访客、销售三类演示账号的菜单/按钮权限已按角色模板生效。
  - 浏览器网络请求确认菜单权限与操作权限的查询、保存、重置接口均已跑通，状态码符合预期。
  - 新增文档 [docs/release-runbook.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/release-runbook.md) 已成功复制到 `/opt/presales-platform/docs/release-runbook.md` 并完成只读校验。
  - 前端执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build` 构建通过；本轮仅保留 Vite 构建产物体积告警，无新增 TypeScript 或样式编译错误。
  - 后端执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build` 构建通过；本轮未改动数据库连接逻辑，仅确认当前代码仍支持本地双入口与云端 MySQL 正式口径并存。
  - 云端执行前端单容器发布后，`presales-frontend` 已正常启动，公网页面 `http://101.43.78.27/?v=202603291530` 可访问。
  - 浏览器线上复测确认：登录后仅保留一条“欢迎回来，示例销售”成功提示，重复的“登录成功”提示已移除；深色模式下工作台与商机管理页面主卡片、搜索区与输入框表现正常，未再出现明显的内层长方形描边和白边被阴影覆盖问题。
  - 第二轮本地验证已完成：系统设置左侧菜单点击不再触发“已切换到：xxx”提示；前端执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build` 再次构建通过，准备进行下一次前端单容器发布与线上复测。
  - 第二轮云端前端单容器发布已完成，`presales-frontend` 正常启动；在线上 `http://101.43.78.27/?v=202603291615` 复测确认：系统设置菜单切换提示已移除，卡片白边已恢复为独立可见的描边效果，工作台“本月业绩趋势”中部区域未再出现明显溢出。
  - 已对 `README.md` 的任务列表做首轮去重整理，合并了 `任务 2A / 任务 2D / 任务 9` 的重复历史快照，保留最新有效状态，后续详细演进继续沉淀在本节会话记录中。
  - 已补充完成线上浏览器验收：管理员账号 `admin_demo / Admin@123` 可正常登录并访问 `项目管理 / 商机管理 / 解决方案 / 系统设置`；访客账号 `guest_demo / Guest@123` 登录后仅显示 `工作台 / 项目管理 / 知识库 / 系统设置`，系统设置内仅保留 `个人资料 / 安全设置 / 通知设置` 三项，权限收口符合预期。
  - 本轮控制台仅发现未登录态首次加载 `/api/auth/me` 返回 `401` 与浏览器 `autocomplete` 提示，未发现新的运行期 JS 异常。
  - 已继续定位并修复线上 `GET /api//workflow-definitions` 双斜杠请求：确认根因是云端 `frontend/src/shared/api.ts` 仍为旧代码；将本地修复版本同步到 `/opt/presales-platform/frontend/src/shared/api.ts` 后重建 `frontend` 容器，再次通过浏览器网络请求复测，当前已变为 `GET /api/workflow-definitions`，返回 `200`。

- 会话日期：2026-03-28
- 当前处理的任务：深色模式第三轮修复与自动化回归，重点清理业务页面中的浅色块，并对指定模块执行浏览器级深色模式验证。
- 本次会话新增内容（前端，主题与样式为主）：
  - 已继续完善全局主题透传：`App` 会同步将 `data-theme` 写入 `document.documentElement` 与 `body`，并补齐 Ant Design 深色令牌中的浮层 / 分割线 / 文字 / 描边颜色，覆盖 `Modal / Select / Dropdown / DatePicker / Drawer / Popover / Tooltip / Message / Notification` 等浮层组件。
  - 已将登录页、工作台、数据分析、商机管理、解决方案、知识库、系统设置中的硬编码浅色卡片进一步切换为 `var(--app-*)` 主题变量或深色渐变，重点清理深色模式下仍然发白的块级区域。
  - 已修复 `知识库 > 文档分类` 中分类卡片的浅底色问题，避免深色模式下出现 `#f8fafc` / `#e6f4ff` 明亮卡块。
  - 已修复 `解决方案 > 方案审批流程` 中审批节点的浅绿色 / 浅橙色 / 浅灰色块，统一改为深色兼容的主题渐变。
  - 已补修 `项目管理 > 项目详情 > 项目进度时间线` 当前阶段与未来阶段卡片颜色，将原有 `#e6f4ff / #fafafa` 切换为主题变量驱动的深色渐变与边框。
  - 已继续完成深色模式第三轮可读性修复：为主题新增成功 / 警告 / 信息 / 危险状态块语义色板，统一收敛工作台待办任务、本月业绩趋势、商机审批流程、团队管理权限说明、权限管理中心菜单权限明细 / 操作权限明细中的亮色块与黑色字体。
  - 已将登录页从原左右分栏说明布局重构为单主卡聚焦登录页，视觉参考 `code.heihuzi.ai/login` 的极简卡片、浅网格背景与青绿色主按钮方向，同时保留真实登录 / 注册接口与演示账号说明。
- 本次会话验证结果：
  - 前端执行 `cd frontend && npm run build` 构建通过；
  - 已在运行态 `http://127.0.0.1:5173/` 使用 `admin_demo / Admin@123` 登录，并切换到深色模式进行浏览器自动化验证；
  - 已逐项验证以下区域在深色模式下不再出现刺眼白块：`知识库 > 文档分类`、`工作台 > 待办任务`、`工作台 > 本月业绩趋势`、`项目管理 > 项目详情 > 项目进度时间线`、`解决方案 > 方案审批流程`、`系统设置 > 团队管理 > 权限说明`、`系统设置 > 权限管理中心 > 菜单权限 / 操作权限`、`系统设置 > 知识库目录管理 > 一级知识库列表`；
  - 本轮继续补充验证：已重新检查登录页新视觉、`工作台 > 待办任务`、`工作台 > 本月业绩趋势`、`商机管理 > 商机审批流程`、`系统设置 > 团队管理 > 权限说明`、`系统设置 > 权限管理中心 > 菜单权限明细 / 操作权限明细` 的计算样式，确认关键容器与说明文字已切换到深色语义色板或浅色登录页语义色板，不再出现深色模式下的黑字 + 浅块组合；
  - 已继续完成你在 2026-03-28 新追加的 8 项视觉与交互收口：未登录态外层黑色顶栏已移除，登录 / 注册页统一切换为单主卡认证壳；认证页默认随浅色模式打开，若用户在深色模式下退出登录，未登录页会继续保持深色背景与浅色文字；登录页与注册页的卡片宽度、留白和背景已统一优化；
  - 已按最新确认的认证页结构继续重构登录 / 注册页面：平台 logo 与平台名称移动到表单框外，作为认证页顶部品牌区；登录页框内仅保留欢迎语、账号、密码、登录按钮；“还没有账户？注册”和“已有账户？登录”改到框外作为单独入口，注册页切换为独立的“创建账户”表单态；
  - 登录页与注册页当前统一使用 420px 主卡宽度，注册态仅增加表单高度，不再单独放大卡片宽度；账号输入占位文案已统一为 `账号/企业邮箱`；注册主按钮已改为明确的 `注册`，注册成功后会提示并切回登录页，而非直接自动登录；
  - 已继续完成认证页细节收口：登录 / 注册页顶部 logo 与平台名称改为居中排布，平台名称字号进一步放大；注册页继续简化为 `姓名 + 账号/企业邮箱 + 密码 + 注册` 四段结构，移除独立邮箱框与确认密码框；注册提交时若输入值包含 `@` 会自动作为邮箱传入后端；
  - 已为认证页输入框补充浏览器 `autofill` 覆盖样式，统一处理“记住密码”场景下账号 / 密码输入框出现白色阴影或亮底的问题；
  - 已修复 `帮助与支持` 被菜单权限守卫误判后自动跳回 `工作台` 的问题，现点击左下角帮助入口可稳定停留在帮助页；
  - 已继续清理浅色模式残留深色块：`工作台 > 本月业绩趋势` 顶部 4 个统计卡已改为浅色语义渐变；`系统设置 > 权限管理中心` 中 `菜单权限 / 操作权限` 的顶部统计卡与成员选择区已改为浅色语义渐变，菜单权限与操作权限明细文字在浅色模式下保持深色可读；
  - 已继续清理深色模式残留浅色块：`商机管理 > 商机审批流程` 中线索确认、项目启动、需求分析、最终审批、审批记录，以及项目启动节点内的审批状态行和负责人选择区均已改为主题语义面板，不再出现浅白底块；
  - 本轮继续补修指定区域：`商机管理 > 商机审批流程` 顶部审批流程说明区已切换为主题语义说明卡；`系统设置 > 团队管理` 底部“当前页面已接入真实团队成员接口...”说明区在浅色模式下已降低阴影和对比度；`工作台 > 本月业绩趋势` 中部图表区已调整为“左侧图例 / 右侧柱状图”布局，并收紧柱宽，避免柱状图超出边框；
  - 已再次通过浏览器自动化完成关键链路验证：默认无登录令牌时进入浅色登录页；切换深色模式并登录后访问 `帮助与支持` 不再跳回；浅色模式下 `本月业绩趋势` 与权限管理中心统计块、权限明细文字颜色正常；深色模式下商机审批流程无浅色刺眼卡块；在深色模式下执行退出登录后，登录页仍保持深色主题展示；
  - 本轮继续补充验证：认证页已确认 logo 与标题居中，注册页仅保留单一 `账号/企业邮箱` 字段与 `注册` 按钮；`本月业绩趋势` 图例已移到左侧且柱图区域收紧；深色模式下 `商机审批流程` 顶部说明区不再是浅色块；浅色模式下团队管理底部说明卡已切换为更轻的浅色渐变面板。浏览器自动填充白色阴影问题因当前环境未保存真实凭据，未能直接复现，但已通过全局 `autofill` 样式覆盖完成代码修复。
  - 本轮浏览器验证期间仍持续出现 `Warning: Maximum update depth exceeded` 控制台错误，触发场景集中在 `系统设置` 页面切换过程中；当前未继续处理其根因，但需要在后续会话中单独排查。

- 会话日期：2026-03-27
- 当前处理的任务：用户认证与团队权限管理一期，目标是将登录从演示态升级为真实用户认证，并将系统设置中的团队成员管理切换为真实后端接口。
- 本次会话已确认方案：
  - 后端新增真实注册 / 登录 / 当前用户信息接口，登录改为校验数据库中的用户与密码哈希，不再接受任意非空账号密码；
  - 用户模型补充密码、团队角色、所属行业、最近登录时间等字段，并按系统角色自动派生权限摘要；
  - 前端登录态改为依赖 `/auth/me` 返回的真实用户信息，不再通过用户名关键字推断“销售 / 工程师 / 经理 / 管理员”；
  - 系统设置中的团队成员列表、新增 / 编辑 / 删除与搜索筛选切换为真实后端接口，第一阶段先使用“系统角色 -> 权限模板”的轻量方案。
- 本次会话新增内容：
  - 后端默认启用本地 SQLite 持久化，补充真实用户字段：密码哈希、所属行业、团队角色、最近登录时间，并新增基于角色模板的权限摘要；
  - 后端实现 `/auth/register`、`/auth/login`、`/auth/me` 与 `/users` 团队成员接口，登录改为校验数据库用户，JWT 当前用户信息改为回查真实用户状态；
  - 后端新增密码哈希工具与最小单测，并在空库首次启动时自动写入 `presales_demo / manager_demo / admin_demo / sales_demo` 四个演示账号；
  - 前端登录页升级为“登录 / 注册”双态表单，注册成功后自动登录；
  - 前端应用入口改为持久化 token 后调用 `/auth/me` 恢复真实用户，顶栏用户名与角色显示改为读取后端返回的真实身份；
  - 前端系统设置中的团队与权限管理切换为真实接口驱动，支持成员列表加载、筛选、添加、编辑、删除，权限摘要按角色自动生成；非管理员 / 经理账号仅保留查看说明。
  - 排查并修复“测试账号仍可删除项目”的权限漏洞：确认项目管理页删除逻辑仅为前端本地状态删除，未校验角色；现已将项目的新建 / 编辑 / 删除及关联商机删除入口统一收敛为仅经理 / 管理员可操作。
  - 新增版本基线约束：后续开发必须以当前已开发版本和当前 Mock 数据基线为准推进，流程库 Mock 数据若出现本地漂移，需先回滚到代码默认模板后再继续开发。
  - 已补充统一权限口径：后端角色模板新增 `menu.*`、`project.*`、`opportunity.*`、`solution.*`、`bidding.*`、`contract.*`、`knowledge.*`、`analytics.*`、`workflow.manage`、`settings.manage` 等权限码；前端左侧菜单改为按 `menu.*` 渲染，商机 / 项目 / 方案 / 投标 / 合同 / 知识库 / 系统设置中的高风险入口统一按权限禁用或拦截。
  - 已在“系统设置 > 流程库”新增“恢复默认模板”按钮，用于将前端流程库 Mock 数据直接回滚到当前代码版本的默认模板，作为后续开发与联调的统一基线。
  - 已完成“系统设置 > 菜单权限管理”一期：后端补齐菜单权限定义、用户级 allow / deny 覆盖接口与 `/auth/me` 返回字段；前端新增与“流程库”同级的“菜单权限管理”页面，仅管理员可见，可按用户配置角色默认菜单、自定义允许、自定义隐藏，并由主导航统一按 `effectiveMenuKeys` 渲染最终可见菜单。
  - 已继续完成前端第二轮页面紧凑化：知识库左侧分类树改为更窄列宽和可滚动分类卡片，一级知识库统计条重构为胶囊标签统计带；项目管理与商机管理的主列表卡片进一步收紧头部与说明区，降低工具栏和统计块高度，保持右侧内容区在固定左侧菜单布局下更集中易扫读。
  - 已确认并启动新一轮“全局视觉与账户体验升级”任务：参考 `code.heihuzi.ai` 的导航与顶栏交互，重构左侧菜单激活态、顶栏标题/副标题、深浅色模式切换、右上角用户区登录/登出反馈，并将“个人资料 / 修改密码”升级为顶部用户区与系统设置共用的一套真实资料维护入口。
  - 已继续完成深色模式第二轮优化：前端新增全局主题样式文件与 `data-theme` 主题变量，统一修正深色模式下 `Card / Table / Menu / Input / Select / Modal / Dropdown / Tabs / Collapse` 的背景、描边和文字对比度；同时将系统设置页的主卡片、左侧菜单与个人资料/安全设置区域切换为主题变量驱动，解决此前“深色外壳下仍出现大片浅色内容块”的问题。
- 本次会话验证结果：
  - 后端执行 `cd backend && npm test` 通过，包含 TypeScript 构建与密码哈希单测；
  - 前端执行 `cd frontend && npm run build` 构建通过；
  - 本轮补充验证：后端执行 `cd backend && npm run build` 通过；前端执行 `cd frontend && npm run build` 通过，菜单权限管理页面与主导航权限收口已通过静态构建校验；
  - 本轮继续补充验证：已在前端运行态 `http://localhost:5173` 使用 `guest_demo / Guest@123` 实际登录验证，访客账号当前仅显示“工作台 / 项目管理 / 知识库 / 系统设置 / 帮助与支持”菜单，系统设置仅保留个人资料 / 安全设置 / 通知设置，项目管理与知识库中均不再显示删除入口；
- 会话日期：2026-03-28
- 当前处理的任务：统一收紧工作台、解决方案、投标管理、合同管理、数据分析等页面的统计卡片高度，使其视觉密度与知识库卡片接近。
- 本次会话新增内容（前端）：
  - 将 `WorkbenchView` 顶部 6 个统计卡片统一为与知识库一致的紧凑卡片样式，收敛圆角、边框、阴影、图标尺寸、数值字号和说明文字字号；
  - 同步将 `SolutionsView`、`BidsView`、`ContractsView`、`AnalyticsView` 的顶部统计卡片切换为同一套紧凑参数，并把对应列表主卡片的边框、阴影、内边距和“列设置”按钮尺寸一起对齐；
  - 对 `WorkbenchView` 中“待办任务 / 本月业绩趋势”两张固定高内容卡做了温和收紧，将整体高度从原先的较高值下调，避免首页纵向占用过大，同时不改动内部业务内容与图表口径。
- 本次会话验证结果：
  - 前端执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build` 构建通过；
  - 本轮以样式收敛为主，已完成编译验证，暂未单独追加浏览器视觉截图回归。

- 会话日期：2026-03-28
- 当前处理的任务：统一项目管理、商机管理、解决方案、投标管理、合同管理、知识库页面的搜索框与筛选区样式、边框和排列规则。
- 本次会话新增内容（前端）：
  - 将 `ProjectsView`、`OpportunitiesDemoView`、`KnowledgeView` 顶部搜索区统一为“带边框筛选工具卡 + 左侧筛选项分组 + 右侧主操作按钮”的布局结构；
  - 将 `SolutionsView`、`BidsView`、`ContractsView` 原先裸露的顶部筛选条整体提升为与上述页面一致的卡片式筛选工具区，统一边框、阴影、内边距和换行规则；
  - 统一各页搜索输入框和下拉筛选的宽度节奏，收敛为接近一致的 `220 / 180 / 240` 宽度梯度，减少页面之间搜索框长短和按钮落位不一致的问题。
- 本次会话验证结果：
  - 前端执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build` 构建通过；
  - 本轮已完成代码层和构建层验证，待后续浏览器回归时再结合视觉效果做细调。

- 会话日期：2026-03-28
- 当前处理的任务：增强数据分析默认仪表盘与“管理层概览”仪表盘的可读性，补齐悬浮数据提示与额外图形组件，并新增两套平台内数据驱动的仪表盘。
- 本次会话新增内容（前端）：
  - 将 `AnalyticsView` 中“管理层概览仪表盘”从原 3 组件补齐为 4 组件布局，新增“业绩趋势”图块，避免右侧空缺；
  - 为默认仪表盘里的销售漏斗、业绩趋势、行业分布、项目进度甘特图补充悬浮提示，鼠标移入后可直接查看当前组件对应的统计数据；
  - 将行业分布中心摘要改为基于当前平台数据动态显示“活跃行业”数量，不再沿用固定文案；
  - 新增两套基于现有平台可选数据范围的仪表盘配置：`金融经营仪表盘` 与 `制造推进仪表盘`，分别复用当前已有的行业、趋势、漏斗、甘特等组件，并按不同数据范围填充。
- 本次会话验证结果：
  - 前端执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build` 构建通过；
  - 本轮已完成代码与构建验证，待后续浏览器回归时进一步确认悬浮提示交互与仪表盘切换视觉效果。

- 会话日期：2026-03-28
- 当前处理的任务：修复系统设置页面 `Maximum update depth exceeded` 循环更新告警，并确认团队管理与权限管理中心切换稳定。
- 本次会话新增内容（前端）：
  - 收敛 `frontend/src/views/SettingsView.tsx` 中菜单权限与操作权限页的派生数组，使用 `useMemo` 固定 `filteredSettingsMenuItems`、权限预览列表和分组后的模块定义，避免每次渲染都生成新引用；
  - 为菜单权限与操作权限模块展开状态补充有序差异比较，仅在展开模块集合确实变化时才执行 `setExpandedMenuModules` / `setExpandedActionModules`，阻断权限页展开态与渲染之间的重复更新链路；
  - 保留现有权限切换与成员加载行为不变，最小范围修复系统设置内部状态同步导致的循环更新问题。
- 本次会话验证结果：
  - 前端执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build` 构建通过；
  - 使用浏览器实际进入“系统设置”，先刷新页面清空旧告警，再依次验证“团队管理 -> 权限管理中心 -> 菜单权限 -> 操作权限”，并补做“菜单权限 / 操作权限 / 团队管理 / 权限管理中心 / 菜单权限”往返切换；
  - 控制台未再出现 `Maximum update depth exceeded`，当前仅剩既有的 Ant Design 弃用提示与一个静态资源 404，不属于本次循环更新问题。

  - 受当前终端环境端口监听限制影响，未在本轮内完成 `register -> login -> me` 的 HTTP 烟测，需要你在本地正常启动 `backend` 后进一步联调确认。

- 会话日期：2026-03-25
- 当前处理的任务：前端 Mock 联动完善，重点统一工作台、合同管理、数据分析之间的共享商机派生口径，并继续完善系统设置、项目管理、商机管理及下游业务页面的联动体验。
- 本次会话新增内容（前端，Mock 为主）：
  - 将“系统设置”中的流程库提升为与插件库同层级的独立菜单，补充“适用商机”字段，并约定商机审批优先自动匹配流程库中的专用流程，未匹配时回退到标准流程；
  - 将商机管理中的默认审批流程能力收敛到流程库来源的单一流程，并补充线索确认上传需求说明、项目启动分配解决方案负责人、需求分析上传调研文档等节点能力；
  - 将项目管理、商机管理、解决方案、投标管理、合同管理、知识库切换为围绕同一份共享商机数据进行派生展示，补充序号、分页、搜索、筛选、共享编号和更多 Mock 数据，保证从商机到合同、知识库的链路联通；
  - 修复多处页面白屏与“页面看起来未更新”的问题，包括投标管理缺失组件导入、部分统计卡片未读取共享数据、工作台与数据分析局部仍使用旧静态数据等；
  - 优化工作台布局，调整“本月业绩趋势”“待办任务”“最近项目”等卡片的尺寸、内容收纳方式与对齐关系；
  - 将工作台“本月签约金额”和“本月业绩趋势”统一到共享月度统计函数，按共享商机派生出的合同签约日期实时计算；
  - 将数据分析页“标准销售仪表盘”的“本月签约”和“业绩趋势”切换为与工作台、合同管理一致的共享月度签约口径，确保三处实时联动一致。
- 本次会话验证结果：
  - 前端执行 `cd frontend && npm run build` 构建通过；
  - 当前仍存在 Vite 构建产物体积偏大的告警，但不影响页面运行与当前 Mock 联动验证。

- 会话日期：2026-03-29
- 当前处理的任务：修复 Codex 启动时 `fetch` MCP client 因命令缺失导致的启动失败告警。
- 本次会话新增内容（环境配置）：
  - 排查确认 `/Users/gjy/.codex/config.toml` 中 `fetch` MCP server 配置使用 `uvx mcp-server-fetch` 启动，但当前机器不存在 `uvx` 可执行文件；
  - 同时确认当前系统 `python3` 版本为 `3.7.8`，无法直接切换为本地 Python 运行 `mcp-server-fetch`；
  - 已将 `.codex/config.toml` 中的 `fetch` MCP 配置临时注释禁用，避免 Codex 启动阶段继续报 `MCP startup incomplete (failed: fetch)`；
  - 随后已通过官方安装脚本补装 `uv`，实际落盘到 `/Users/gjy/.local/bin/uv` 与 `/Users/gjy/.local/bin/uvx`，并将 `source "$HOME/.local/bin/env"` 追加到 `/Users/gjy/.zshrc`，保证后续 shell 会话可自动识别；
  - 已恢复 `.codex/config.toml` 中的 `fetch` MCP 配置为 `uvx mcp-server-fetch`；
  - 已实际执行 `uvx mcp-server-fetch --help`，确认 `uvx` 能自动拉起独立 Python 3.10 运行时并正常启动 `mcp-server-fetch`。
- 本次会话验证结果：
  - 初始阶段使用 `command -v uvx` 确认当前环境无 `uvx`；
  - 使用 `python3 --version` 确认当前环境 Python 版本为 `3.7.8`；
  - 使用 `pip3 show mcp-server-fetch` 确认本机未安装该包；
  - 安装完成后再次验证 `command -v uv` 与 `command -v uvx` 均已可用；
  - 进一步验证 `uvx mcp-server-fetch --help` 成功输出帮助信息，说明 `fetch` MCP 所需启动命令已恢复可用。

- 会话日期：2026-03-26
- 当前处理的任务：项目管理时间线阶段导航改造，支持从项目详情中的已走过流程节点直接跳转到对应业务模块，并自动筛出当前项目。
- 本次会话新增内容（前端，Mock 为主）：
  - 将项目详情中的静态“项目进度时间线”改为基于项目当前阶段动态渲染的阶段导航器；
  - 已走过阶段与当前阶段显示为可点击入口，点击后自动跳转到对应业务菜单，并按项目名或客户名筛出当前项目；
  - 未进入的后续阶段统一置灰禁用；当项目处于 `lost` 时，额外展示丢单终态说明卡片；
  - 补齐 `ProjectsView` 到解决方案、投标管理、合同管理页面的关键字透传，避免跳转后页面未自动定位到当前项目。
  - 统一“商机名称 -> 项目名称”的共享派生规则，并将商机管理搜索补充为同时支持商机名称、客户名称和派生项目名称匹配；
  - 移除项目详情弹窗右下角独立的“跳转到当前阶段”按钮，改为仅通过时间线节点执行阶段跳转。
  - 在项目列表右上角新增“选择显示列”多选控件，并补充“显示全部 / 恢复默认”操作，支持用户临时调整项目表格列显隐；
  - 为项目列表表头增加列宽拖拽能力，并将列宽和显示列偏好存入本地存储，刷新后保留上一次配置。
  - 抽出通用表格偏好工具，开始将列设置、显示全部、恢复默认、列宽拖拽、横向滚动和本地记忆能力复刻到商机、解决方案、投标、合同和知识库列表页面。
  - 新增 [docs/mock-data-catalog.md](/Users/gjy/Projects-mygetpre/presales-platform/docs/mock-data-catalog.md)，统一记录共享商机数据、下游派生规则、知识库基础文档、知识库目录树、默认流程模板、团队成员默认数据以及相关本地存储键，作为后续 Mock 数据维护基线。
  - 调整商机管理的数据加载口径：当后端返回的商机数量少于前端共享 Mock 数据时，商机列表改为按共享 Mock 数据为基线合并展示，避免出现项目、关联商机与商机列表数量不一致的问题。
  - 修正项目详情时间线跳转到商机管理时的历史阶段过滤逻辑：点击已走过的“商机发现”节点时改为按项目名定位该项目，不再因强制附带 `discovery` 过滤导致同一项目在商机列表中被筛掉；仅当当前项目本身仍处于 `discovery` 阶段时才保留该阶段过滤。

- 会话日期：2026-03-20
- 当前处理的任务：任务 3 / 任务 4 的交界阶段——在完成登录与鉴权框架后，已落地首批核心实体建模，并优先为商机（Opportunity）与方案版本（SolutionVersion）实现基础 API；前端侧同步推进基于 `pre-sales-system/demo.html` 的整体 UI 复刻与工作台 / 各业务菜单页面原型搭建。
- 本次会话新增内容（前端，Mock 为主）：
  - 优化“工作台”展示布局，压缩高度，尽量一屏展示关键统计卡片、最近项目和待办任务；
  - 在“投标管理 / 合同管理”列表中增加“销售负责人 / 售前负责人”列，示例数据与团队管理中的角色保持一致；
  - 完善“商机管理 / 项目管理 / 解决方案”中销售负责人字段的展示与编辑逻辑，统一使用中文负责人名称；
  - 在“数据分析”视图中补充仪表盘管理能力，支持新建 / 编辑仪表盘（Mock）、选择组件和设为默认仪表盘；
  - 新增“帮助与支持”和“插件库”菜单，前者提供用户手册与技术支持入口占位，后者集中管理图标与 Logo 资源（Mock 上传 / 下载 / 引用标识）。
  - 在“项目管理”视图中补充项目列表“序号”列与分页能力；将项目名称点击行为调整为直接进入项目详情视图；将项目详情页底部跳转按钮改为“跳转到对应阶段里的此项目”，并在跳转到商机管理时携带当前项目名称与阶段用于定位对应记录。
- 已完成内容：
  - 确认项目定位与核心价值。
  - 拟定前后端技术栈与核心实体模型方向（前端：React + TS + Vite + AntD；后端：NestJS + MySQL + TypeORM）。
  - 确认采用单仓库结构：根目录下使用 `frontend/` 与 `backend/` 分别承载前后端代码。
  - 输出首版需求列表与任务规划，并细化任务 1 的子任务方案。
  - 在仓库中创建 `frontend/` 与 `backend/` 目录，分别落地 React+TS+Vite+AntD 前端脚手架与 NestJS+MySQL+TypeORM 后端脚手架（含健康检查接口）。
  - 在 `frontend/.npmrc` 与 `backend/.npmrc` 中配置 npm 国内源，加速后续依赖安装。
  - 你在本地完成前端依赖安装并成功启动 Vite 开发服务器，基础页面可正常访问。
  - 你在本地完成后端依赖安装并成功启动 NestJS 服务，`/health` 接口返回 `{ status: "ok" }`。
  - 在前端实现登录页模板（账号、密码表单 + 登录按钮 + 产品简介），并基于 Ant Design 进行布局与交互提示。
  - 在后端新增 `AuthModule`，提供 `/auth/login` 登录接口，使用 JWT 生成访问令牌，并提供 `/auth/me` 受保护示例接口。
  - 在后端启用 CORS 支持，以便前端开发服务器（Vite）可以直接调用后端登录接口。
  - 在前端登录页中接入后端 `/auth/login` 接口，成功登录后将 `accessToken` 持久化到 `localStorage`，并根据登录结果给出成功或失败提示。
  - 你在本地完成前后端联调验证：前端登录页调用后端 `/auth/login` 接口获取 `accessToken`，并可使用该令牌访问受保护的 `/auth/me` 示例接口，验证登录与基础鉴权流程正常。
  - 在后端新增领域层 `DomainModule`，实现用户、客户、线索、商机、方案版本与评审记录等核心实体的 TypeORM 建模，为后续 API 开发提供统一数据结构。
  - 在后端实现商机（Opportunity）模块，包括 `OpportunitiesModule`、`OpportunitiesService` 与 `OpportunitiesController`，并提供基于 JWT 鉴权保护的 `/opportunities` REST 接口（列表、详情、创建、更新、删除）。
  - 在后端实现方案版本（SolutionVersion）模块，包括 `SolutionVersionsModule`、`SolutionVersionsService` 与 `SolutionVersionsController`，并提供基于 JWT 鉴权保护的 `/opportunities/:id/solutions` 与 `/solutions/:id` 等 REST 接口（按商机查询方案版本列表、创建方案版本、查看单个方案版本详情、更新与删除）。
  - 在前端侧，基于 `frontend/pre-sales-system/demo.html` 完成售前工作台整体布局复刻：登录后进入的主界面采用左侧深色菜单 + 顶部浅色顶栏的布局，顶栏左侧展示“折叠按钮 + 当前页名”，右侧为通知图标、头像与当前登录用户信息，整体视觉风格与 demo.html 保持一致。
- 在前端实现基于 Mock 数据的“商机管理 / 售前工作台”视图（`PreSalesDemoView`），支持重点商机统计卡片、商机列表 + 详情弹窗（含客户、销售负责人、阶段、金额等基础信息）、方案相关示意模块（审批流程、文档概览、合同生成示例等），用于预演后续接入真实实体（Opportunity / SolutionVersion / ReviewRecord / Contract）后的完整工作台体验。
  - 在当前“商机管理”菜单下的 React 视图（`OpportunitiesDemoView`）中，提供了基于前端状态的 Mock 商机新建能力：通过“+ 新建商机（Mock）”弹窗可以在前端追加示例商机记录（名称、客户、销售负责人、阶段、预期价值、成功概率、预计关闭时间），不写入后端，仅用于预演后续 `/opportunities` 创建接口接入后的交互体验；商机列表中新增“销售负责人”列，并通过统一的 Mock 销售负责人列表（示例映射：`zhangsan_sales` → “张三（金融行业负责人）”等）以中文展示负责人名称，顶部提供“只看我负责的”开关以及“按销售负责人多选过滤（示例）”下拉，可按当前登录账号或指定销售负责人快速过滤商机数据。
  - 在前端实现“投标管理”视图（`BidsView`），包括投标总数 / 中标数 / 中标率 / 进行中等统计卡片，以及投标项目列表表格（项目名称、客户、销售负责人、售前负责人、招标编号、进度、开标时间、投标金额、状态与操作），整体布局与 demo.html 中对应区域保持一致，目前“销售负责人 / 售前负责人”列使用与团队管理一致的中文示例名称，便于后续与角色配置联动。
  - 在前端实现“合同管理”视图（`ContractsView`），提供合同搜索输入框与状态筛选下拉框，顶部展示合同总数、总合同金额、已签约与执行中等统计卡片，下方为合同列表表格（合同名称、客户、销售负责人、售前负责人、合同金额、付款条件、签约日期、状态与操作），并提供“生成合同（示例）”弹窗，用于演示通过表单收集合同信息并触发合同生成流程的交互，其中销售负责人 / 售前负责人同样采用与项目 / 商机 / 解决方案视图一致的示例负责人名称，方便后续打通角色模型。
- 在前端实现“知识库”视图（`KnowledgeView`），支持文档搜索与分类筛选、知识库统计卡片（文档总数、分类数量、我的收藏、热门文档）以及左侧可点击的分类卡片 + 右侧文档列表表格（文档名称、分类、作者、更新时间、大小及预览 / 下载 / 删除示例操作），内容基于 Mock 数据，布局风格与 demo.html 的“知识库”区域保持一致；同时在“上传文档”模态框中，除了复刻点击/拖拽上传区域和示例文件列表外，还新增了“可选文档分类”下拉框与基于最近上传文件名的分类推荐提示，确认上传后会将示例文件按所选分类追加到当前文档列表中，用于预演后续接入真实文档上传与自动归类能力（当前仍不执行真实文件上传，仅前端 Mock）。
  - 在前端实现“数据分析”视图（`AnalyticsView`），复刻 demo.html 中的销售数据驾驶舱，包含商机总数 / 本月签约 / 平均成交周期 / 商机转化率等统计卡片，以及销售漏斗、月度业绩趋势柱状图、行业分布环形图示意和项目进度甘特图，目前使用静态示例数据，用于预演后续接入真实统计接口后的展示方式；在此基础上新增“仪表盘管理（Mock）”能力：提供仪表盘下拉框用于切换不同仪表盘（标准销售、趋势分析、管理层概览等示例），支持“新建仪表盘（Mock）”和“编辑当前仪表盘（Mock）”弹窗（可自由勾选销售漏斗 / 业绩趋势 / 行业分布 / 项目进度甘特图等组件作为当前仪表盘内容）、设定默认仪表盘，并在页面底部以标签形式提供仪表盘组件顺序的拖拽示例（记录组件顺序但不改变当前布局），用于预演后续支持“新建仪表盘、选择样式与数据、拖拽调整组件顺序并保存为默认数据分析首页”的能力，当前全部为前端示例数据与交互占位。
  - 在前端实现“系统设置”视图（`SettingsView`），提供左侧设置菜单（个人资料、安全设置、通知设置、团队管理、系统配置、数据管理）与右侧“团队与权限管理”表格（成员姓名、邮箱、角色、权限范围与状态）及权限说明区域，整体交互与 demo.html 中“系统设置”区域保持一致，目前使用静态示例成员数据预演后续角色/权限接入方案。
- 未完成 / 待办事项：
  - 在任务 3 中根据后续业务需求继续细化实体模型（如合同、投标记录、复盘记录等），并补充必要字段。
  - 在任务 4 中为其他实体（方案版本、评审记录等）逐步提供基础 API，并结合前端页面原型（如商机列表页、项目详情页）进行联调与完善。
  - 已确认新增“审批流程库与审批实例”需求，需要在系统设置中将当前流程库 Mock 升级为真实可配置能力，并为商机管理 / 解决方案管理补充审批实例、节点审批人与“通过 / 驳回”动作的完整后端链路。

如果上次会话意外中断且本节信息不完整，Agent 需要先分析“任务记录 vs 实际代码”的偏差，与你讨论后再决定下一步。

## 开发与分支策略（摘要）

结合 `AGENTS.md` 中的规则，在此简要提醒开发流程：
- 新功能必须在独立分支开发，禁止直接在主分支上开发（例如：`feature/init-project-structure`）。
- 合并分支前必须经过你的同意。
- 每次提交都需要清晰、专业的提交说明。
- 安装依赖时必须优先使用国内源或代理（如 npm 使用国内镜像、pip 使用国内源等）。

## 最新进展补充（2026-03-28）

- 当前处理的任务：继续收口前端视觉与交互优化，补强数据分析页默认仪表盘、管理层概览仪表盘及新增行业仪表盘的展示与悬浮数据能力，并补做浏览器自动化回归。
- 本次新增内容（前端，Mock 为主）：
  - 已为数据分析页的销售漏斗、业绩趋势、行业分布、项目进度甘特图补齐基于当前平台可选数据的悬浮提示文案，支持在普通页面和大屏预览态中按组件查看对应数据；
  - 已将“管理层概览仪表盘”从原 3 个组件补齐为 4 个组件，新增趋势区块；同时新增“金融经营仪表盘”“制造推进仪表盘”两套示例仪表盘，分别基于当前共享商机数据按行业范围展示；
  - 已修复默认大屏预览分支遗漏行业分布与甘特图的问题，当前标准销售仪表盘与制造推进仪表盘在预览态中都能完整展示并响应 hover tooltip；
  - 已保持数据分析页各仪表盘的数据来源仍统一复用平台内现有共享商机与阶段数据，未额外引入第二套静态口径。
- 本次验证结果：
  - 已执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build`，构建通过；
  - 已在本地运行态 `http://127.0.0.1:5173/` 完成浏览器自动化验证，确认“管理层概览仪表盘”“金融经营仪表盘”“制造推进仪表盘”切换正常；
  - 已在浏览器中验证普通态 tooltip：漏斗、趋势、行业分布、甘特图均可显示对应数值或项目阶段说明；
  - 已在浏览器中验证预览态 tooltip：标准销售仪表盘与制造推进仪表盘的漏斗、趋势、行业分布、甘特图均可显示对应提示数据；
- 当前仍有 Vite 打包体积告警，但不影响本轮页面功能与自动化验证结论。

- 当前处理的任务：统一工作台、项目管理、商机管理、解决方案、投标管理、合同管理、知识库、数据分析等页面的卡片与搜索区边框/阴影表现，并继续收口系统设置左侧菜单的视觉一致性与菜单顺序。
- 本次新增内容（前端，Mock 为主）：
  - 已统一八个核心业务页面顶部紧凑卡片的边框与阴影样式，改为基于 `var(--app-border)` 与 `var(--app-shadow)` 的一致描边方案，修复阴影压住亮边导致顶部圆角缺口的问题；
  - 已在全局主题层统一输入框、搜索框、下拉框、日期选择器等控件的边框、悬停、聚焦阴影表现，避免搜索区控件在浅色/深色模式下出现边框上沿被阴影覆盖的问题；
  - 已优化系统设置页左侧“设置菜单”的菜单项底板、边框和阴影逻辑，使默认态和激活态阴影风格统一；
  - 已按最新确认调整系统设置菜单顺序，将“知识库目录管理”移到“图标/Logo插件库”上方，并将“平台品牌与Logo设置”调整到最下方。
- 本次验证结果：
  - 已执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build`，构建通过；
  - 已在本地运行态 `http://127.0.0.1:5173/` 通过浏览器截图回归检查工作台、项目管理、系统设置页面，确认浅色模式下卡片/搜索框顶部圆角亮边显示正常；
- 已在深色模式下回归检查系统设置页，确认左侧菜单阴影与描边表现统一，菜单顺序正确。
- 本轮继续对深色模式做第二次收口：
  - 已进一步下调深色模式卡片、搜索框、输入框、下拉框顶部描边亮度，改为“弱边框 + 顶部轻微内高光 + 深色阴影”的组合，避免顶部圆角出现发白或描边过硬的问题；
- 已移除系统设置左侧菜单中基于分组高亮的差异底色逻辑，当前“个人资料 / 安全设置 / 通知设置 / 团队管理 / 权限管理中心 / 审批流程库 / 知识库目录管理 / 图标Logo插件库 / 平台品牌与Logo设置”全部使用同一套底板、边框和阴影，仅当前选中项保留统一的强调态；
- 已在深色模式下重新回归工作台、项目管理、系统设置页面截图，确认卡片与搜索框顶部圆角描边恢复自然，设置菜单各项色调一致。
- 本轮继续完成顶部导航与认证页收口：
  - 已将顶栏告警铃铛从写死 `5` 改为联动当前平台待办数据，当前按“待完成方案评审 / 待提交投标文件 / 待安排客户调研 / 待推进合同谈判”四类工作项动态计算，并支持点击铃铛展开下拉清单后直接跳转到对应业务页面；
  - 已继续增强顶栏通知中心交互：新增“方案 / 投标 / 商机 / 合同”四色类型标签，打开铃铛后会将当前通知批量标记为已读并清空未读角标，点击单条通知也会同步标记已读并跳转到对应模块；
  - 已将右上角账户按钮补充下拉箭头，与下拉菜单交互保持一致；
  - 已将登录页“账号 / 企业邮箱”输入框补充下拉指示符，向参考站点的账户选择感知对齐。
- 本轮自动化验证结果：
  - 已执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build`，构建通过；
  - 已在运行态 `http://127.0.0.1:5173/` 使用 `admin_demo / Admin@123` 登录；
  - 已在深色模式下逐页回归工作台、项目管理、商机管理、解决方案、投标管理、合同管理、知识库、数据分析，确认搜索框与卡片边线未再被阴影覆盖，圆角显示正常；
  - 已验证顶栏告警铃铛初始显示为联动值 `4`，其下拉列表与工作台当前四项待办一致；展开后未读角标已清零，且四条通知均带有对应类型标签色块；
  - 已验证点击通知项可直接跳转到对应业务页面；已验证右上角账户区显示下拉箭头并可展开菜单；
  - 已验证登录页账号输入框显示下拉指示符。
  - 本轮同步启动“平台上云一期”基础改造：前端新增 [frontend/src/shared/api.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/api.ts) 统一管理 API 基地址，并将认证、商机、知识库、系统设置、方案版本、评审记录等写死的 `localhost:3000` 请求改为环境变量驱动；后端新增 [backend/src/config/runtime.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/config/runtime.ts) 统一收口端口、主机、CORS、JWT、数据库与 `DB_SYNCHRONIZE` 配置，并同步改造 [backend/src/main.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/main.ts)、[backend/src/app.module.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/app.module.ts)、[backend/src/auth/auth.module.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/auth/auth.module.ts)、[backend/src/auth/jwt.strategy.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/auth/jwt.strategy.ts)。
  - 已新增上云部署所需文件：[frontend/Dockerfile](/Users/gjy/Projects-mygetpre/presales-platform/frontend/Dockerfile)、[backend/Dockerfile](/Users/gjy/Projects-mygetpre/presales-platform/backend/Dockerfile)、[frontend/nginx.conf](/Users/gjy/Projects-mygetpre/presales-platform/frontend/nginx.conf)、[docker-compose.yml](/Users/gjy/docker-compose.yml)、[.env.example](/Users/gjy/.env.example)、[frontend/.env.example](/Users/gjy/Projects-mygetpre/presales-platform/frontend/.env.example)、[backend/.env.example](/Users/gjy/Projects-mygetpre/presales-platform/backend/.env.example)，并补充 `.dockerignore` 以减小镜像上下文。
  - 已在本地完成前后端构建验证：`cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build`、`cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build` 均通过；由于当前开发机未安装 Docker，暂未执行 `docker compose config/up`，该步骤转移到云服务器执行。

## 最新进展补充（2026-03-29）

- 当前处理的任务：任务 9“平台上云一期”，继续收口后端容器构建方案，优先解决 `backend` 镜像因 `sqlite3` 原生模块导致的构建不稳定问题。
- 本次新增内容（部署配置）：
  - 已将 [backend/Dockerfile](/Users/gjy/Projects-mygetpre/presales-platform/backend/Dockerfile) 从 `node:20-alpine` 三阶段构建调整为 `node:20-bookworm` + `node:20-bookworm-slim` 的 Debian 系列多阶段构建，避免 Alpine/musl 环境下 `sqlite3` 原生模块编译与运行兼容性问题；
  - 已移除运行层的 `npm ci --omit=dev`，改为在构建层执行 `npm run build && npm prune --omit=dev`，并将裁剪后的 `node_modules` 直接复制到运行层，减少重复安装和二次触发原生模块处理的概率；
  - 已复核 `backend/.npmrc` 仍指向 `https://registry.npmmirror.com`，保持后续云端安装依赖时优先走国内镜像源。
- 本次验证结果：
  - 已执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build`，构建通过；
  - 当前开发机仍未安装 Docker，`docker --version` 返回 `command not found`，因此本轮无法在本机执行 `docker compose --progress plain build backend`；
  - 下一步应在云服务器上直接执行 `docker compose --progress plain build backend` 验证镜像是否已可构建，若通过再继续串行拉起 `mysql -> backend -> frontend` 并做公网 IP 联调验收。
  - 云服务器首次执行 `docker compose up -d mysql` 后，已进一步定位到 MySQL 启动失败根因为 `mysql:8.4` 不再接受 `--default-authentication-plugin=mysql_native_password`；对应报错为 `unknown variable 'default-authentication-plugin=mysql_native_password'`。现已从 [docker-compose.yml](/Users/gjy/docker-compose.yml) 中移除该启动参数，下一步需在服务器上重新拉起 MySQL 并继续验证 `backend -> frontend` 启动链路。
  - 云服务器继续联调时，已进一步定位到后端建表失败根因为用户实体中的 `simple-array` 字段在 MySQL 8.4 下映射为 `TEXT`，而原配置带有 `default: ""`，触发 `BLOB, TEXT, GEOMETRY or JSON column 'mainIndustry' can't have a default value`。现已将 [backend/src/domain/entities/user.entity.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/domain/entities/user.entity.ts) 中 `mainIndustry / allowedMenuKeys / deniedMenuKeys / allowedActionKeys / deniedActionKeys` 五个数组列改为 `nullable: true`，并在代码层保留空数组初始化；本地 `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build` 已再次通过。下一步需将同样修改同步到云服务器代码后重建 `backend` 镜像并重新启动服务。
  - 云服务器完成修正后，`mysql / backend / frontend` 三个容器均已成功启动；`curl http://127.0.0.1/api/health` 与 `curl http://101.43.78.27/api/health` 均返回 `{"status":"ok"}`，`http://101.43.78.27/` 可正常返回前端入口 HTML，说明 Nginx 静态站点与 `/api` 反向代理链路已打通。
  - 已通过浏览器对公网地址 `http://101.43.78.27/` 做线上验收：管理员账号 `admin_demo / Admin@123` 可成功登录，工作台、商机管理、系统设置页面正常加载；刷新后会调用 `/api/auth/me` 成功恢复登录态；浏览器控制台未发现 error/warning。
  - 已继续验证访客账号 `guest_demo / Guest@123`：左侧菜单已按权限收口为 `工作台 / 项目管理 / 知识库 / 系统设置 / 帮助与支持`，系统设置内部仅保留 `个人资料 / 安全设置 / 通知设置`，项目管理中的“新建项目”按钮为禁用态、列表“编辑”按钮也为禁用态，说明菜单与页面级权限控制在云上运行态已生效。
  - 已继续收口一项低优先级问题：前端原先通过 `buildApiUrl("")` 取得基础地址后，再拼接 `/workflow-definitions`，会形成 `/api//workflow-definitions` 的双斜杠路径。现已在 [frontend/src/shared/api.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/api.ts) 中补充空路径分支：当 `path` 为空时直接返回不带尾斜杠的 `API_BASE_URL`，避免继续生成双斜杠请求；本地已执行前端构建验证。
  - 已补充服务器侧工具与账户约定：当前云服务器继续维持 `root / deploy / claw` 三类账户分工，其中 `deploy` 负责 `/opt/presales-platform` 的部署、Docker Compose 运维与 Codex CLI 使用，`claw` 仅用于既有 `openclaw` 运行，`root` 只保留系统级安装与应急维护；不再新增第四个 `codex` 用户，避免与项目目录权限、Docker 权限和 `openclaw` 运行环境产生交叉复杂度。
  - 已在云服务器 `deploy` 用户下完成 Codex CLI 安装，当前命令路径为 `/home/deploy/.npm-global/bin/codex`，版本为 `codex-cli 0.117.0`；Codex 配置目录约定为 `/home/deploy/.codex/`，用户级配置文件为 `/home/deploy/.codex/config.toml`，API Key 环境文件约定为 `/home/deploy/.openai-env`。
  - 服务器侧 Codex 当前采用最小化配置：`model = gpt-5.4`、`approval_policy = on-request`、`sandbox_mode = workspace-write`、`multi_agent = false`；暂未将本机的完整 MCP 组合（如 `playwright / chrome-devtools / memory`）迁移到云服务器，仅保留后续按需补装 `uv/uvx` 与 `fetch/context7` 的空间，以降低与 `openclaw` 的环境耦合和维护复杂度。

## 最新进展补充（2026-03-30）

- 当前处理的任务：继续执行任务 7“云上联调一期”，重点修正项目管理与商机管理之间的项目主线绑定逻辑，并将“帮助与支持”从占位页升级为平台流程说明页。
- 本次新增内容（前端，Mock 联动为主）：
  - 已将共享商机数据补充为显式项目绑定模型：商机新增 `projectKey / projectName` 字段，项目管理不再按“每条商机生成一个项目行”的方式派生，而是按同一项目主线聚合展示；
  - 已重构项目管理派生逻辑：项目预算改为汇总同一 `projectKey` 下全部商机金额，关联商机列表也改为按显式项目绑定过滤，不再按客户名称自动混合；
  - 已在项目详情中收口关联商机创建逻辑：从项目详情新建的商机会自动继承当前项目的 `projectKey / projectName`，并即时同步回商机管理；对于状态为“已完成 / 签约中标”的项目，“+ 新建关联商机（Mock）”按钮改为置灰，同时展示封板说明；
  - 已在商机管理“新建 / 编辑商机”弹窗中新增“所属项目”配置，要求商机显式选择“绑定已有项目”或“新建项目并绑定”，避免系统静默创建项目导致主线归属不清；
  - 已重做“帮助与支持”页面，当前展示平台总览、售前生命周期六阶段说明、项目与商机关系说明、知识库沉淀建议与快速上手指引，不再是简单占位文案。
- 本次验证结果（公网环境 `http://101.43.78.27/`）：
  - 已验证“帮助与支持”页面成功切换为新的平台流程说明；
  - 已验证“项目管理 > 已完成项目详情”中“+ 新建关联商机（Mock）”按钮为禁用态，并展示“项目主线已封板，不允许继续新增关联商机”的说明；
  - 已在“项目管理 > 某银行数字化转型项目”中实际新建 1 条关联商机，创建后项目预算由 `¥500万` 更新为 `¥620万`，关联商机数由 `1` 更新为 `2`，项目阶段随最新商机推进到“方案设计”；
  - 已验证该新建商机同步出现在“商机管理”列表首行，未额外生成新的项目行；项目列表总数保持 `9`，说明同一项目主线已按聚合口径展示；
  - 已验证“商机管理 > + 新建商机”弹窗已出现“所属项目”显式绑定 UI，包含“绑定已有项目 / 新建项目并绑定”两种模式。
- 当前结论：
  - 项目主线与商机关系已从“名称/客户推断”切换为“显式项目绑定”；
  - 云上当前回归未发现该链路的阻塞性问题，后续可继续基于同一模型扩展真实 Opportunity / Project 实体联调。

- 当前处理的任务：继续收口前端管理与设置体验，统一删除权限展示、补齐共享负责人映射，并修复设置页缩放与帮助页深色主题问题。
- 本次新增内容（前端，Mock 与本地持久化为主）：
  - 已为解决方案、投标管理、合同管理补充删除按钮与确认弹窗；删除按钮改为始终显示，无权限时统一置灰。项目管理、商机管理、知识库、数据分析、系统设置中的团队管理 / 流程库 / 知识库目录等删除入口也同步收口为“显示但禁用”的统一规则；
  - 已为解决方案、投标管理、合同管理新增本地删除记忆能力，删除后的记录会在当前浏览器本地保持移除状态，不会因页面刷新立即回到列表中；
  - 已新增共享团队成员快照层：[frontend/src/shared/teamDirectory.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/teamDirectory.ts)。系统设置中的团队成员加载、编辑、新增后会同步写入本地快照；项目、商机、解决方案、投标管理、合同管理等页面的销售负责人 / 售前负责人展示与新建默认值会优先读取该快照，不再仅依赖硬编码示例账号；
  - 已增强共享商机归一化逻辑：若旧数据缺少客户、销售负责人或售前负责人，前端会优先从项目键与共享团队成员快照中补齐，减少项目、商机、解决方案、投标管理、合同管理中出现空白负责人字段的情况；
  - 已为审批流程库“恢复默认模板”补充持久化记忆：恢复后会记录为当前浏览器后续登录的默认展示内容；点击“重新加载”时才会主动从后端流程库刷新覆盖；
  - 已继续优化设置页缩放适配：平台品牌与 Logo 设置、审批流程库、知识库目录管理的顶部工具栏改为可换行布局；图标 / Logo 插件库的顶部卡片、筛选区、上传弹窗和表格补充了自适应与横向滚动保护；
  - 已修复帮助与支持在深色模式下“快速上手建议”出现浅色白块的问题，并顺手将总览卡、阶段卡和建议卡统一切到主题变量驱动，避免深色模式继续出现局部写死浅色背景。
- 本次验证结果：
  - 已执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build`，由于 `dist` 清理权限受限，先失败后以提权方式重跑，最终构建通过；
  - 当前前端构建产物已包含本轮改动，后续如需继续云上联调，只需按既有策略做前端单独部署即可。

## 最新进展补充（2026-04-01）

- 当前处理的任务：继续执行任务 7“云上联调一期”，重点收口云服务器上的商机审批显示异常、解决方案审批越权以及权限管理中心加载报错问题。
- 本次新增内容（云服务器 `/opt/presales-platform` 实机修复）：
  - 已确认云服务器上的前后端代码此前落后于本地 2026-04-01 的审批 / 权限修复版本，已完成审批与权限相关源码同步、镜像重建和 `backend / frontend` 容器重启；
  - 已修复“权限管理中心点击后报 `用户菜单权限加载失败：400`”问题。当前公网环境下管理员进入“系统设置 > 权限管理中心”后，可正常加载成员列表、菜单权限和操作权限矩阵，不再出现 400 报错；
  - 已修复商机审批弹窗错误回退到前端演示链路的问题：前端 `approvalInstances` 请求层已兼容“无审批实例时后端返回 200 空响应体”的情况，不再因 `Unexpected end of JSON input` 触发演示回退；
  - 已将商机页与解决方案页的数据同步策略改为“后端 API 可用时以真实商机数据为准”，不再把本地演示商机与真实后端主键混用；这样可以避免像 `OPP-000010` 这类仅存在于前端演示层的数据继续触发审批接口时传入不存在的 `businessId`；
  - 已收紧审批节点责任人解析逻辑：`sales_manager / solution_manager / sales_director / tech_director` 等经理类节点当前只解析为经理角色用户，不再默认把管理员一并视为可审批人，避免管理员对非本人节点产生隐式越权。
- 本次验证结果（公网环境 `http://101.43.78.27/`）：
  - 已验证“系统设置 > 权限管理中心”可以正常打开，成员卡片、菜单权限矩阵和状态摘要均可加载；
  - 已验证商机管理当前展示已与后端真实商机主键对齐，列表总数从混合态的 `10` 条收口为后端真实返回的 `6` 条；
  - 已验证商机 `OPP-000002` 的审批弹窗已经切换为“后端真实审批实例”，第 4、5 步保持待分配 / 待上传状态，不再像之前那样在流程未到达时提前点亮；
  - 已验证经理类审批节点当前显示的处理人列表中不再包含管理员账号，说明“仅当前节点责任人可处理”的约束已按后端逻辑收紧。
- 当前结论：
  - 云服务器上的审批问题根因并非单点页面 Bug，而是“云端代码版本滞后 + 前端演示数据混入真实业务主链路 + 经理节点默认放宽到管理员”三项叠加；
  - 当前这三项问题已在云端完成修复并通过公网页面复测；
  - 若后续仍需保留 `OPP-000010` 之类业务样例，需要补充真实后端商机种子数据或录入流程，而不是继续依赖前端演示数据直接参与审批。

## 最新进展补充（2026-04-02）

- 当前处理的任务：继续执行“云端真实数据收口”，将项目管理、商机管理、解决方案、投标管理、合同管理统一切到同一套后端真实业务数据主链路，并补齐缺失的真实业务样例。
- 本次新增内容（本地代码已完成，待同步到云服务器 `/opt/presales-platform`）：
  - 已在 [backend/src/users/users.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/users/users.service.ts) 补充真实业务账号种子，包括 `zhangsan_sales / lisi_sales / wangwu_sales / zhaoliu_sales / other_user`，用于承接真实商机负责人、售前负责人和后续审批链路；
  - 已新增 [backend/src/opportunities/business-seed.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/opportunities/business-seed.service.ts)，在服务启动时幂等补齐客户、线索、商机、方案版本四类真实业务种子；当前内置 10 条业务样例，覆盖 `discovery / solution_design / proposal / negotiation / won` 等关键阶段，其中已补入此前线上提到的真实 `OPP-000010` 对应业务样例“城市生命线监测平台项目”；
  - 已调整 [backend/src/opportunities/opportunities.module.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/opportunities/opportunities.module.ts) 挂载业务种子服务，并在 [backend/src/solution-versions/solution-versions.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/solution-versions/solution-versions.service.ts) 为方案列表查询补齐 `createdBy` 关联，便于前端展示真实方案负责人；
  - 已新增统一真实商机加载层 [frontend/src/shared/realOpportunities.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/realOpportunities.ts)，约定前端优先通过 `/api/opportunities?page=1&pageSize=100` 拉取真实商机并回写共享快照，避免各页面继续各自读取本地演示切片；
  - 已将 [frontend/src/views/ProjectsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/ProjectsView.tsx)、[frontend/src/views/BidsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/BidsView.tsx)、[frontend/src/views/ContractsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/ContractsView.tsx)、[frontend/src/views/WorkbenchView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/WorkbenchView.tsx) 切换为启动时主动同步真实商机数据，因此项目、投标、合同、工作台四个页面后续会与商机管理保持同源；
  - 已继续改造 [frontend/src/views/SolutionsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/SolutionsView.tsx)：解决方案列表不再只按商机阶段做前端推导，而是优先按每条商机关联的真实 `solution_versions` 生成列表项，审批状态、版本号、负责人和方案版本主键均来自后端真实数据；共享商机更新时也会同步刷新真实方案列表。
  - 已进一步修复商机详情口径漂移：`[frontend/src/views/OpportunitiesDemoView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/OpportunitiesDemoView.tsx)` 的“跳转到项目管理”已从按客户过滤改为按项目名称过滤；详情页“商机转化流程”已改为优先读取真实审批实例节点状态，没有真实实例时仅按 `workflowRecords` 展示，不再从商机结果字段反推中间节点状态。
  - 已修复共享商机归一化中的“真实数据被旧 demo 字段污染”问题：`[frontend/src/shared/opportunityDemoData.ts](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/shared/opportunityDemoData.ts)` 不再按 `id / opportunityCode` 套用默认演示商机，避免像真实 `OPP-000008` 这类记录错误继承旧 demo 的审批文档和审批状态。
- 本次验证结果：
  - 已执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build`，构建通过；
  - 已执行 `cd /Users/gjy/Projects-mygetpre/presales-platform/frontend && npm run build`，构建通过；
  - 当前本地构建已确认“后端种子 + 前端统一数据源”方案可编译，下一步需要把这批改动同步到云服务器，重建 `backend / frontend` 容器，并在公网环境验证五条业务链路是否全部切换到真实数据。
- 后续追加修复（2026-04-02 当日继续收口）：
  - 已将 [frontend/src/views/OpportunitiesDemoView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/OpportunitiesDemoView.tsx) 的商机详情流程补充“业务阶段兜底”逻辑：当真实审批实例尚未启动、但商机业务进度已进入“需求分析”或更后阶段时，查看页与本地审批视图会将当前节点落到第 5 步“需求分析”或后续节点，而不再机械停留在前置节点；
  - 已将 [frontend/src/views/SolutionsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/SolutionsView.tsx) 的解决方案审批入口统一为“所有状态都可查看审批流程”：`草稿 / 审核中 / 已批准 / 已驳回` 均保留“审批”入口；非当前节点责任人进入后保持只读查看，不能执行动作；
  - 已为解决方案“查看”弹窗补充审批过程摘要与“查看完整审批流程”入口，确保用户从查看详情也能进入审批过程，保持与商机模块一致的可见性口径；
  - 已统一商机与解决方案审批说明文案：所有成员均可查看流程进度与历史记录，仅当前节点责任人可执行上传、分配、通过或驳回。
- 当前结论：
  - 本轮已把“共享数据保持一致”的关键问题从数据结构上收口为“商机真实数据主链路 + 真实方案版本列表”；
  - 云端待执行项已明确为“同步代码 -> 重建服务 -> 公网回归验收”，验收重点是 `项目管理 / 商机管理 / 解决方案 / 投标管理 / 合同管理` 五页展示数量、负责人、阶段和审批状态是否一致。
  - 已继续收口商机查看/审批过程与真实业务字段脱节的问题：`[frontend/src/views/OpportunitiesDemoView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/OpportunitiesDemoView.tsx)` 现已在打开商机详情或审批弹窗时主动拉取 `/opportunities/:id` 真实详情字段，不再只使用列表页的精简快照；因此 `bizApprovalStatus / techApprovalStatus / requirementBriefDocName / researchDocName / solutionOwnerUsername / approvalOpinion` 等字段会参与流程展示与文档区渲染。
  - 已修正“仅查看审批流程却误创建后端审批实例”的问题：商机审批弹窗打开时改为先查询 `GET /approval-instances/current`，不再无条件 `start/ensure` 新实例；这样成员查看流程不会再把未发起商机错误推进成一个空白的第 1 节点实例。
  - 已补充“休眠审批实例”展示降级逻辑：若后端已存在审批实例但尚无任何动作记录，同时商机业务快照已进入更后阶段，则前端会按真实业务快照展示节点状态，并明确提示“当前仅支持查看”，避免把流程错误压回“线索确认待上传”。
  - 已继续修正商机驳回态的后置节点高亮问题：当业务快照或审批记录显示某个审批节点已驳回时，商机审批弹窗会将其后所有节点统一置灰为“未执行”，不再因为已有文档字段就把第 4/5/6 步提前点亮。
  - 已补充商机审批记录的“业务快照回放”兜底：若后端审批实例存在但 `actions` 为空，而商机真实字段已包含上传文档、审批通过/驳回、负责人分配等结果，前端会生成只读审批记录供查看，避免记录区继续显示为空白。

## 最新进展补充（2026-04-04）

- 当前处理的任务：继续执行任务 10“飞书 / OpenClaw MVP”，本轮继续完成飞书开放平台加密策略启用、云端配置同步和版本发布收口。
- 本次新增内容（云服务器 `/opt/presales-platform`）：
  - 已通过 `deploy@101.43.78.27` 登录服务器，将飞书应用 `claw机器人` 的当前凭据写入云端 `.env`：`BACKEND_FEISHU_APP_ID=cli_a94bed4806381bd9`、`BACKEND_FEISHU_APP_SECRET=gbocoGB5c1UieiPllB1Ucd7l2VS0aWZQ`、`BACKEND_FEISHU_VERIFICATION_TOKEN=ntHf9LlkYKYHr4NexGnOIhuxTsmeLhND`；
  - 已在飞书开放平台“事件与回调 -> 加密策略”中重置并生成新的 `Encrypt Key=MttEwq1R8RKbTlL1S0GKlcCTACvap3cO`，随后同步写入云端 `.env` 的 `BACKEND_FEISHU_ENCRYPT_KEY`；
  - 已在云端执行 `docker compose up -d backend` 重建 `presales-backend`，并确认 `backend / frontend / mysql` 三个容器均处于运行状态；
  - 已复核后端启动日志，确认 NestJS 成功启动，且飞书相关接口已在运行态挂出，包括 `/integrations/feishu/events`、`/integrations/feishu/cards/action`、`/integrations/feishu/bindings`、`/integrations/feishu/messages/approval-cards/send` 等；
  - 已在飞书开放平台将事件订阅地址保留为 `http://101.43.78.27/api/integrations/feishu/events`、卡片回调地址保留为 `http://101.43.78.27/api/integrations/feishu/cards/action`，并创建发布版本 `1.0.1`，当前页面显示“当前修改均已发布”；
  - 已在本地后端补丁中修复 `POST /integrations/feishu/cards/action` 的 `challenge` 响应兼容，解决飞书后台此前“Challenge code没有返回”导致回调地址保存失败的问题；
  - 已确认先前出现的 `502 Bad Gateway` 只是后端刚重启时的短暂启动窗口，不是配置错误或持续性故障。
- 本次验证结果：
  - 云端内网健康检查 `http://127.0.0.1/api/health` 返回 `{"status":"ok"}`；
  - 公网健康检查 `http://101.43.78.27/api/health` 返回 `{"status":"ok"}`；
  - 飞书开放平台“版本管理与发布”页显示版本 `1.0.1` 状态为“已发布 / 通过”，`事件与回调` 页显示“当前修改均已发布”，加密策略页中 `Encrypt Key` 已不再显示“未开启”；
  - `docker compose ps` 显示 `presales-backend` 运行正常，`presales-frontend` 继续提供公网 `80` 端口服务，`presales-mysql` 维持 `healthy`。
- 当前结论：
  - 云服务器已经具备飞书 MVP 后端运行所需的完整基础凭据、加密参数与事件/卡片回调路由，不再停留在“代码已部署但环境未配置”的状态；
  - 飞书后台当前的开发者服务器模式、事件地址、卡片回调地址和 `Encrypt Key` 已全部发布生效，下一步可以直接进入真实私聊命令、审批卡片发送和回调联调；
  - 后续仍需继续做真实飞书账号绑定、消息下发与审批卡片回写验收，但“云端配置缺口”这一阻塞点已经解除。

## 最新进展补充（2026-04-05）

- 当前处理的任务：继续执行任务 10“飞书 / OpenClaw MVP”，本轮聚焦真实飞书审批卡片回调验收与旧卡片失效行为确认。
- 本次新增内容（云服务器 `/opt/presales-platform` + 真实飞书联调）：
  - 已确认真实审批实例 `23` 在 `2026-04-05 01:47:59` 的第一次点击中已真正执行成功：云端 `feishu_callback_logs.id=71` 状态为 `processed`，`approval_instances.id=23` 已更新为 `approved`；
  - 随后在 `2026-04-05 01:49:17` 对同一张旧卡再次点击时，云端 `feishu_callback_logs.id=72` 返回 `ignored`，`resultJson.toast.content` 为“当前卡片已失效，请重新获取最新审批卡片。”，说明这次提示属于旧卡重复点击后的预期保护，不是审批主链路回退；
  - 已继续核对云端待处理实例，当前最新仍处于 `in_progress` 的实例包括 `21 / 20 / 19 / 16` 等，其中实例 `21` 仍为可继续验证的新卡来源；
  - 已通过云端联调接口 `POST /integrations/feishu/messages/approval-cards/send` 将实例 `21` 的最新审批卡重新发送到真实飞书私聊账号 `ou_04f5c38ef1840e7fe1fbdadd57b62e06`，返回 `mode=sent`，最新消息 `message_id=om_x100b5228537034a4c32ccb1b0982dc6`。
- 本次验证结果：
  - 已确认“当前卡片已失效”这一提示目前来自旧卡重复点击，而不是加密回调、签名校验、绑定映射或审批执行失败；
  - 已确认云端补发新卡成功，最新可操作验证卡为实例 `21` 对应的 `message_id=om_x100b5228537034a4c32ccb1b0982dc6`；
  - 当前下一轮验收应直接基于这张新卡继续点击“通过/驳回”，不再重复使用实例 `23` 的旧卡。
- 当前结论：
  - 飞书审批主链路目前已能正确区分“首次真实执行成功”和“旧卡重复点击失效”两类场景；
  - 下次会话若继续本任务，应直接从“观察实例 `21` 最新卡点击后的飞书客户端表现与云端回调记录，继续收敛动作回调的最终兼容返回体”开始，而不需要再次排查实例 `23`。

### 飞书卡片回写联调补记（2026-04-05 续）

- 本轮继续针对“点击通过后，飞书页面仍报错或卡片仍可点击”做真实联调，并已完成以下确认：
  - 已修正后端 `backend/src/integrations/feishu/feishu.service.ts` 中两处真实问题：
    - 卡片动作成功/失效回调不再只返回 `toast`，而是同时返回最新 `card` 与 `update_multi=true`，尝试让飞书直接刷新当前卡片；
    - 之前回调成功后生成的新卡片仍把按钮错误渲染为可点击，根因是 `buildApprovalCardView()` 读取的是 `canHandleCurrentNode`，而 `ApprovalsService.findOne()` 实际返回字段名为 `canCurrentUserHandleCurrentNode`；现已兼容两种字段名。
  - 本地验证已再次通过：
    - `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build`
    - `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm test -- --runInBand`
  - 云端已同步最新 `feishu.service.ts` 并多次重建 `presales-backend`，健康检查保持正常：`http://127.0.0.1/api/health -> {"status":"ok"}`。
- 本轮真实飞书测试结果：
  - 真实实例 `20`、`16`、`19` 已先后被推进到“商务评审”节点，并分别向真实飞书账号 `ou_04f5c38ef1840e7fe1fbdadd57b62e06` 发送新卡；
  - 最新一次有效点击为实例 `19` 的卡片 `SOL-000008 省级教育云资源平台实施方案`：
    - 云端 `feishu_callback_logs.id=82` 状态为 `processed`；
    - `approval_instances.id=19` 已从“商务评审”推进到“最终审批”；
    - 最新回调返回体中，`card.actions[approve/reject].disabled=true` 已正确生成，说明“后端返回禁用按钮”的逻辑已修正成功。
- 当前仍未完全收口的问题：
  - 即便后端回调已返回带 `disabled=true` 的最新卡片，飞书 Web 页面中刚刚点击的最新卡片仍未稳定刷新为禁用态；截图观察到旧卡片区域可能变灰，但新点击卡片本身仍保留“通过/驳回”按钮样式；
  - 因此，剩余问题已进一步缩小为“飞书客户端对 `POST /integrations/feishu/cards/action` 回包中 `card` 字段的刷新协议兼容性”，而不再是平台审批执行、权限判断或按钮禁用数据本身错误。
- 下次会话建议直接从这里继续：
  - 以 `feishu_callback_logs.id=82` 为基线，对比飞书官方要求的卡片动作回包格式，重点验证当前返回的 `card` JSON 是否需要使用不同包装结构、不同字段名或更保守的返回体；
  - 不必再次排查审批落库、角色映射、节点推进或“只有当前节点处理人可执行”的老问题，这些链路本轮已被再次验证为正常。

### 飞书卡片回调最终收口（2026-04-05）

- 本轮继续执行任务 10“飞书 / OpenClaw MVP”，重点完成飞书审批卡片动作回包协议的最终兼容修正与真实账号闭环验证。
- 本次新增内容（本地 `/Users/gjy/Projects-mygetpre/presales-platform` + 云服务器 `/opt/presales-platform`）：
  - 已将 `backend/src/integrations/feishu/feishu.service.ts` 中的卡片动作回包统一调整为飞书 JSON 2.0 兼容格式，回调成功时不再直接返回旧版 `config/header/elements`，而是返回 `card: { type: "raw", data: <JSON 2.0 card> }`；
  - 已将交互卡片结构统一迁移到 JSON 2.0 语义：补齐 `schema: "2.0"`、`config.update_multi`、`header`、`body.elements`，并移除真实联调中确认不兼容的旧写法；
  - 已修正两个导致飞书客户端不能稳定刷新卡片的具体兼容问题：
    - JSON 2.0 中不再使用 `note` 标签展示状态徽标，已改为 `div + lark_md`；
    - JSON 2.0 中不再使用 `tag: "action"` 容器包按钮，已改为将 `button` 直接放入 `body.elements`，并按官方模式使用 `behaviors.callback` / `behaviors.open_url`。
  - 已在卡片动作执行前补充“当前飞书操作者是否仍是当前节点处理人”的前置校验：若用户点击的是历史旧卡片，则不再向飞书客户端抛出错误，而是返回“当前卡片已失效，请重新获取最新审批卡片。”的黄色提示，并同步回写为禁用态卡片；
  - 已在本地完成验证：
    - `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm run build`
    - `cd /Users/gjy/Projects-mygetpre/presales-platform/backend && npm test -- --runInBand`
  - 已将上述修正同步部署到云端并完成容器重建，当前后端健康检查保持正常。
- 本轮真实飞书验证结果：
  - 旧卡片失效场景已经按预期处理：
    - 云端 `feishu_callback_logs.id=85` 记录状态为 `ignored`；
    - `feishu_message_logs.id=90` 模板为 `card_action_forbidden`；
    - 用户确认点击历史旧卡时，飞书端不再出现致命报错，而是提示卡片已失效并刷新为不可继续操作状态。
  - 新卡片审批成功场景已经按预期处理：
    - 为验证“最终审批”节点，曾临时将真实飞书绑定从 `manager_demo` 切换到 `admin_demo`，向实例 `20` 补发最新审批卡，消息 `message_id=om_x100b52155db550a0c35b78d6b2c1599`；
    - 用户在真实飞书中点击“通过”后，云端 `feishu_callback_logs.id=86` 状态为 `processed`；
    - `approval_instances.id=20` 已成功推进为 `approved`，`currentNodeId=NULL`；
    - `feishu_message_logs.id=92` 模板为 `card_action_approve`，`sendStatus=sent`；
    - 用户确认飞书端点击后显示成功提示，按钮转灰，不再可重复点击。
  - 验证完成后，真实绑定已恢复到业务正常口径：
    - `feishu_user_bindings.id=1`
    - `feishuOpenId=ou_04f5c38ef1840e7fe1fbdadd57b62e06`
    - `platformUserId=2`
    - `platformUsername=manager_demo`
    - `department=售前管理部`
    - `status=active`
- 当前结论：
  - 飞书审批卡片主链路已经完成真实闭环：私聊命令 -> 待审批查询 -> 审批卡片下发 -> 卡片动作回调 -> 平台审批执行 -> 飞书端结果提示与卡片失效保护，均已在真实环境完成验证；
  - 已基于 `origin/master` 新建对齐分支 `pr/docs-feishu-openclaw-sync`，并在 GitHub 创建 [PR #2](https://github.com/123gongjingyun/git_data/pull/2)：
    - 标题：`Sync presales platform snapshot and finalize Feishu OpenClaw MVP status`
    - 包含当前完整项目快照、最终版 README、以及旧压缩包 `presales-platform.zip` 的移除；
  - [PR #2](https://github.com/123gongjingyun/git_data/pull/2) 已于 `2026-04-05` 成功合并到 `master`，GitHub 侧 merge commit 为 `f5f8185 Merge pull request #2 from 123gongjingyun/pr/docs-feishu-openclaw-sync`；
  - 远端临时分支 `pr/docs-feishu-openclaw-sync` 已删除；本地当前开发分支 `docs/feishu-openclaw-dev-plan` 已在 `5133a00 Merge origin/master after PR #2 sync` 中回合并 `origin/master`，两条历史已建立共同祖先；
  - 已新增第二轮飞书自动化回归测试 [backend/test/feishu-service.test.js](/Users/gjy/Projects-mygetpre/presales-platform/backend/test/feishu-service.test.js) 与首轮 OpenClaw 只读集成测试 [backend/test/openclaw-service.test.js](/Users/gjy/Projects-mygetpre/presales-platform/backend/test/openclaw-service.test.js)，并已通过本地 build + test；下次会话若继续本任务，应优先进入“云端配置 `BACKEND_OPENCLAW_SHARED_TOKEN` 并做真实 OpenClaw 联调”或“继续补更细粒度的飞书签名/加密边界测试”，而不需要再回头处理 GitHub PR 对齐、合并或历史连通问题。
  - 云端 OpenClaw 只读入口已经发布并通过最小联调验收，本机 OpenClaw skill 包装、真实会话验证、摘要参数兼容修复和回复文案收口也已完成；下次会话应直接从“继续扩展审批类自然语言拦截提示，或优化结果卡片/摘要模板内容密度”继续，而不需要再重复服务器发布、本机 skill 配置、4 类基础查询验证、摘要参数兼容修复或回复文案基础收口步骤。

### OpenClaw 只读拒绝文案补强（2026-04-05）

- 本轮继续执行任务 10“飞书 / OpenClaw MVP”，聚焦审批类自然语言请求的只读拒绝口径收口，避免真实会话中出现“像是要帮用户执行审批”的误导性前缀。
- 本次新增内容：
  - 已在 [backend/src/integrations/openclaw/openclaw.service.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/integrations/openclaw/openclaw.service.ts) 中将写操作拒绝文案从简单的“当前只允许只读查询”升级为明确指导语：OpenClaw 当前只接了只读能力，不能直接执行审批通过、驳回、修改、删除、创建或指派，并明确提示用户可继续查询“待我审批、今日简报、商机摘要、方案摘要”，真正执行审批需回到飞书审批卡片或平台页面。
  - 已同步更新 [backend/test/openclaw-service.test.js](/Users/gjy/Projects-mygetpre/presales-platform/backend/test/openclaw-service.test.js) 断言，并重新完成本地 `backend` 的 build + test 验证，当前 OpenClaw 相关测试总数仍保持通过。
  - 已将相同口径同步部署到云服务器 `101.43.78.27` 的运行态后端，并通过 `POST /api/integrations/openclaw/query` 实测确认：对“帮我审批通过 OPP-000001”会返回 `403 OPENCLAW_READONLY_ONLY`，且提示文案为更新后的完整三句指导语。
  - 已补强本机 OpenClaw skill 文案约束 [~/.openclaw/skills/presales-platform-openclaw/SKILL.md](/Users/gjy/.openclaw/skills/presales-platform-openclaw/SKILL.md)：对审批通过、驳回、创建、删除、修改、指派等写请求，要求只输出最终拒绝答复，不再先说“我先确认”“我刚确认平台能力”“避免瞎点”等过程性前缀，也不再默认附带额外排障分析。
- 当前结论：
  - 平台后端的只读边界已经更清晰，真实或脚本调用都会稳定返回统一拒绝语，不会再落回过于笼统的“只允许只读查询”。
  - 最新一轮真实 OpenClaw 会话已确认：后端拒绝链路和只读保护文案均已生效；但在本轮补强前，模型侧仍曾输出“我先确认这个平台有没有审批通过的可用接口”这类过程性前缀。
  - 后续继续排查发现，问题不在平台后端，而在本机 OpenClaw 对 `presales-platform-openclaw` skill 的自动命中和元信息匹配不足：skill 虽然已安装为 `ready`，但普通“帮我审批通过 OPP-000001”请求下未稳定命中，导致模型仍会自由发挥并吐出过程性前缀，甚至在异常场景里把 `LLM request timed out.` 暴露给最终用户。
  - 已在本机 skill 元信息中补充写请求触发描述，并把 `presales-platform-openclaw` 加入本机 `~/.openclaw/skills/skills.config.json` 默认启用列表靠前位置；同时继续收紧 skill 规则，要求写操作拒绝时首句必须直接进入固定三句拒绝语，禁止任何前置解释句。
  - 已于 `2026-04-05` 继续完成两轮真实本机 OpenClaw 复测：
    - 显式点名 `presales-platform-openclaw` skill 后，最终回复已经能落到正确的三句固定拒绝语，但仍曾先输出“我先查一下这个 skill 本地有没有隐藏的审批能力或接口说明”；
    - 在补齐 skill 描述与本机技能配置后，再次直接发送普通请求“帮我审批通过 OPP-000001”，真实回复已经收敛为单条固定拒绝语：不再出现“我先确认”“我先查一下”或 `LLM request timed out.` 这类过程性前缀。
  - 随后继续完成第二轮写操作说法覆盖回归，以下真实请求均已命中同一条固定只读拒绝语，且未再出现过程性前缀：
    - `帮我撤回审批 OPP-000001`
    - `帮我转派审批 OPP-000001 给张三`
    - `帮我批量审批通过 OPP-000001 和 OPP-000002`
    - `帮我删除商机 OPP-000001`
    - `帮我创建方案 SOL-000001`
  - 随后继续完成 4 类正常只读查询真实回归，以下请求均返回了符合预期的直接结果文本，且未出现“我先查一下”“我先确认”之类过程性前缀：
    - `待我审批` -> `当前没有待审批。`
    - `给我今日简报` -> 正常返回 `今日简报如下：` 开头的摘要结果
    - `商机摘要 OPP-000001` -> 正常返回 `OPP-000001` 的阶段、金额、审批节点、风险点与下一步建议
    - `方案摘要 SOL-000001` -> 正常返回 `SOL-000001` 的版本、状态、关联商机、摘要与最近更新时间
  - 随后继续执行“摘要结果压缩与排版收口”：
    - 已在本机 [~/.openclaw/skills/presales-platform-openclaw/SKILL.md](/Users/gjy/.openclaw/skills/presales-platform-openclaw/SKILL.md) 中补充更严格的摘要格式约束，明确要求去掉重复区块、将结果控制为 4-6 条关键信息、`下一步建议` 最多 1 条，并分别给出 `今日简报 / 商机摘要 / 方案摘要` 的字段优先级。
    - 初次直接复测时，发现普通 `--to` 请求仍复用旧主会话 `7af4c7a1-88ae-4176-b2cb-6f1919bb86b5`，导致输出沿用旧格式；仅重启 gateway 不足以清掉这段历史上下文。
    - 继续排查后确认：要验证新的 skill 文案是否真实生效，必须使用全新的显式 `--session-id` 运行独立会话。新会话的 `systemPromptReport.skills.entries` 中已能看到 `presales-platform-openclaw` 被真正注入。
    - 在三条全新 `session-id` 真实回归中，摘要格式已明显收紧：
      - `给我今日简报` -> 收敛为 6 行左右的单段摘要，只保留日期、待审批、风险商机数、今日更新方案数、关注商机总数和 1 条下一步建议，不再重复输出 `平台摘要` 区块；
      - `商机摘要 OPP-000001` -> 收敛为名称、阶段/金额、赢单概率、当前审批节点、核心风险、1 条下一步建议，不再展开多条并列建议；
      - `方案摘要 SOL-000001` -> 收敛为名称、版本/状态、关联商机、1 句摘要、最近评审、最近更新时间，不再堆叠审批状态、客户、创建人等次级字段。
  - 前端可验证入口补记（确认日期：2026-04-05）：
    - 已在后端 [openclaw.controller.ts](/Users/gjy/Projects-mygetpre/presales-platform/backend/src/integrations/openclaw/openclaw.controller.ts) 新增 JWT 受保护的浏览器联调接口 `POST /integrations/openclaw/playground/query`，当前会直接复用登录用户 `req.user.id` 作为 `platformUserId` 转发到现有 `openclawService.query()`，从而避免浏览器侧暴露 `x-openclaw-token` 共享令牌。
    - 已在前端 [OpenClawPlaygroundView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/OpenClawPlaygroundView.tsx) 新增“OpenClaw 联调台”页面，并挂载到 [SettingsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/SettingsView.tsx) 的“系统设置 -> OpenClaw联调”菜单中。页面现已支持：
      - 输入任意测试命令并发送；
      - 一键快捷触发 `待我审批 / 今日简报 / 商机摘要 / 方案摘要 / 只读拦截` 5 类典型命令；
      - 同时展示“结果预览”和“原始响应 JSON”，并保留最近 5 次联调记录，便于你直接在平台页面验收当前 OpenClaw 能力，而不必再切到飞书或终端。
    - 已继续补充前端只读拦截体验收口：当联调台发送 `帮我审批通过 OPP-000001` 并命中后端 `OPENCLAW_READONLY_ONLY` 时，页面不再按普通失败处理，而是会明确展示 `只读拦截已生效` 告警、结果区错误说明、原始错误响应 JSON，并在最近请求中标记为 `已拦截`，便于区分“预期拒绝”与“真正异常”。
    - 本轮已完成自动化回归：浏览器进入“系统设置 -> OpenClaw联调”后点击 `只读拦截`，已确认页面同时出现 `只读拦截已生效` 提示、`OPENCLAW_READONLY_ONLY` 错误文案、`原始错误响应 JSON` 区块以及最近请求 `已拦截` 标签；同时本地 `frontend npm run build` 已再次通过。
    - 已继续补充前端可视化验收体验：联调台顶部新增“快捷命令”说明卡片，直接展示每条典型命令的用途和示例文本；结果区上方新增“联调概览”，可按本轮请求实时统计成功返回、只读拦截和异常失败数量；右侧新增“最近状态”卡片，用于直接查看最近一次命中技能及结果状态。
    - 本轮再次完成真实页面回归：浏览器进入“系统设置 -> OpenClaw联调”后，已确认新布局中出现 `快捷命令 / 联调概览 / 最近状态` 三个新区域；点击 `今日简报` 后，`联调概览` 中“本轮请求=1、成功返回=1”实时更新，右侧 `最近状态` 同步显示 `今日简报 / 成功 / get_daily_brief · matched_daily_brief_keywords`，说明新 UI 已与真实联调结果联动。
    - 已继续将右侧“最近请求”升级为更接近对话流的联调回放：每条记录会同时展示用户发送的测试命令、系统返回的摘要标题、核心结果摘要，以及命中技能和时间，便于在不展开原始 JSON 的情况下直接回看最近 5 次测试链路。
    - 本轮再次完成真实页面回归：在“系统设置 -> OpenClaw联调”中先点击 `今日简报`、再点击 `只读拦截`，已确认右侧“最近请求”区域连续出现两段 `联调回放`，分别展示成功摘要和只读拦截摘要；同时 `联调概览` 实时更新为“本轮请求=2、成功返回=1、只读拦截=1、异常失败=0”。
    - 已继续补充“回放点击联动结果区”能力：右侧每条 `联调回放` 记录现在都保留对应请求的前端快照，点击后会把左侧结果预览、原始 JSON、输入框文本和右侧“最近状态”一起切换到该次请求，避免重复发送相同命令才能回看细节。
    - 本轮再次完成真实页面回归：在“系统设置 -> OpenClaw联调”中先生成 `今日简报` 与 `只读拦截` 两条回放，再点击第一条成功回放，已确认左侧结果区重新显示 `今日简报 / get_daily_brief / matched_daily_brief_keywords`，同时右侧“最近状态”也同步切换为成功结果，不再沿用后一次拦截状态。
    - 已继续补充结果区工具面板：顶部新增 `复制摘要 / 导出记录 / 展开JSON` 三个快捷操作；当前可一键复制左侧摘要文本、将本轮回放导出为本地 JSON 文件，并按需展开或收起成功/拦截结果的原始响应 JSON，默认不展开长 JSON。
    - 本轮再次完成真实页面回归：浏览器进入“系统设置 -> OpenClaw联调”后，已确认工具按钮 `复制摘要 / 导出记录 / 展开 JSON` 可见；点击 `今日简报` 后再点击 `展开 JSON`，按钮已切换为 `收起 JSON`，且结果区内已出现 `原始响应 JSON` 区块，说明折叠/展开逻辑生效。
    - 已继续完成 5 轮前端增强并同步到当前 GitHub 分支 `docs/feishu-openclaw-dev-plan`，对应提交依次为：`810e616 Improve OpenClaw playground readonly error handling`、`b6c6641 Polish OpenClaw playground validation UI`、`c6ac482 Add chat-style OpenClaw playground history`、`1fc254d Link playground history back to result preview`、`2e662e5 Add playground export and payload controls`。至此，本地独立仓库 `/Users/gjy/Projects-mygetpre/presales-platform` 与远端分支已对齐，OpenClaw 联调页当前基线以该分支为准。
    - 已补充一轮云端前端最小化同步：确认服务器目录 `/opt/presales-platform` 为上传式部署目录而非 Git 工作树后，按“只同步前端必要文件、不动 backend/mysql”的原则，将 [frontend/src/views/OpenClawPlaygroundView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/OpenClawPlaygroundView.tsx)、[frontend/src/views/SettingsView.tsx](/Users/gjy/Projects-mygetpre/presales-platform/frontend/src/views/SettingsView.tsx) 与 [README.md](/Users/gjy/Projects-mygetpre/presales-platform/README.md) 回传到云端同路径，并执行 `docker compose build frontend` + `docker compose up -d frontend` 完成第二次前端容器重建。云端文件已确认包含 `OpenClaw联调` 菜单项与最新联调页代码；当前剩余唯一待办为继续做公网页面最终验收，确认 `http://101.43.78.27/` 登录后左侧菜单和 `复制摘要 / 导出记录 / 展开 JSON` 三个按钮均已可见。
    - 本轮已完成本地验证：`backend npm run build`、`backend npm test -- --runInBand`、`frontend npm run build` 全部通过。下次若要现场验收，应直接在本地启动前后端后进入“系统设置 -> OpenClaw联调”页面操作。
  - 因此，下次会话若继续本任务，应直接从“继续微调新摘要模板的字段取舍，例如是否去掉今日简报中的‘关注商机总数’、是否把商机金额格式化为带千分位和货币单位，或继续扩展更边缘的写操作别名（如作废、关闭、重开、提交变更）”开始，而不需要再回头处理当前这 4 类基础只读查询、基础写操作拒绝话术和摘要压缩生效路径的排查问题。

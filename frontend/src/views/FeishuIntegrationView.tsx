import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "../shared/auth";
import {
  createDefaultFeishuIntegrationState,
  loadFeishuIntegrationMockState,
  saveFeishuIntegrationMockState,
  type FeishuCardActionPreview,
  type FeishuBindingRecord,
  type FeishuBindingStatus,
  type FeishuCommandPreview,
} from "../shared/feishuIntegrationMock";
import { buildApiUrl } from "../shared/api";

const { Text, Paragraph } = Typography;

type PreviewMode = "bindings" | "commands" | "cards";
type CommandExecutionStatus = "idle" | "success" | "error" | "empty";
type CommandExecutionState = {
  title: string;
  subtitle?: string;
  summaryLines: string[];
  fields: Array<{ label: string; value: string }>;
};
type BindingSortKey =
  | "updatedAt_desc"
  | "updatedAt_asc"
  | "name_asc"
  | "department_asc";
type CommandRequestInfo = {
  command: string;
  endpoint: string;
  requestedAt: string;
  source: string;
  result: "success" | "error" | "empty";
  durationMs?: number;
};

interface FeishuIntegrationViewProps {
  currentUser: CurrentUser | null;
  accessToken?: string | null;
}

function getStatusColor(status: FeishuBindingStatus) {
  switch (status) {
    case "active":
      return "green";
    case "disabled":
      return "volcano";
    case "pending":
    default:
      return "gold";
  }
}

function getStatusLabel(status: FeishuBindingStatus) {
  switch (status) {
    case "active":
      return "已绑定";
    case "disabled":
      return "已停用";
    case "pending":
    default:
      return "待确认";
  }
}

export function FeishuIntegrationView(props: FeishuIntegrationViewProps) {
  const { currentUser, accessToken } = props;
  const [form] = Form.useForm();
  const [previewMode, setPreviewMode] = useState<PreviewMode>("bindings");
  const [state, setState] = useState(() => loadFeishuIntegrationMockState());
  const [selectedCardId, setSelectedCardId] = useState<string>(() =>
    loadFeishuIntegrationMockState().cards[0]?.id ?? "",
  );
  const [commandExecution, setCommandExecution] =
    useState<CommandExecutionState | null>(null);
  const [commandExecutionStatus, setCommandExecutionStatus] =
    useState<CommandExecutionStatus>("idle");
  const [commandExecutionMessage, setCommandExecutionMessage] = useState("");
  const [bindingKeyword, setBindingKeyword] = useState("");
  const [bindingStatusFilter, setBindingStatusFilter] = useState<
    FeishuBindingStatus | "all"
  >("all");
  const [bindingSortKey, setBindingSortKey] =
    useState<BindingSortKey>("updatedAt_desc");
  const [bindingPage, setBindingPage] = useState(1);
  const [bindingPageSize, setBindingPageSize] = useState(5);
  const [recentCommandRequest, setRecentCommandRequest] =
    useState<CommandRequestInfo | null>(null);
  const [selectedActionKey, setSelectedActionKey] = useState("");

  const selectedCard = useMemo(
    () => state.cards.find((item) => item.id === selectedCardId) ?? state.cards[0],
    [selectedCardId, state.cards],
  );

  useEffect(() => {
    setSelectedActionKey(selectedCard?.actions[0]?.key ?? "");
  }, [selectedCard]);

  const filteredBindings = useMemo(() => {
    const keyword = bindingKeyword.trim().toLowerCase();
    const nextBindings = state.bindings.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.feishuName.toLowerCase().includes(keyword) ||
        item.feishuOpenId.toLowerCase().includes(keyword) ||
        item.platformUsername.toLowerCase().includes(keyword) ||
        item.department.toLowerCase().includes(keyword);
      const matchesStatus =
        bindingStatusFilter === "all" || item.status === bindingStatusFilter;
      return matchesKeyword && matchesStatus;
    });

    const sortedBindings = [...nextBindings];
    sortedBindings.sort((left, right) => {
      if (bindingSortKey === "updatedAt_desc") {
        return right.updatedAt.localeCompare(left.updatedAt);
      }
      if (bindingSortKey === "updatedAt_asc") {
        return left.updatedAt.localeCompare(right.updatedAt);
      }
      if (bindingSortKey === "name_asc") {
        return left.feishuName.localeCompare(right.feishuName, "zh-Hans-CN");
      }
      return left.department.localeCompare(right.department, "zh-Hans-CN");
    });
    return sortedBindings;
  }, [bindingKeyword, bindingSortKey, bindingStatusFilter, state.bindings]);

  useEffect(() => {
    setBindingPage(1);
  }, [bindingKeyword, bindingSortKey, bindingStatusFilter]);

  const pagedBindings = useMemo(() => {
    const startIndex = (bindingPage - 1) * bindingPageSize;
    return filteredBindings.slice(startIndex, startIndex + bindingPageSize);
  }, [bindingPage, bindingPageSize, filteredBindings]);

  const bindingSummary = useMemo(() => {
    const activeCount = filteredBindings.filter((item) => item.status === "active").length;
    const pendingCount = filteredBindings.filter((item) => item.status === "pending").length;
    const disabledCount = filteredBindings.filter((item) => item.status === "disabled").length;
    return [
      {
        label: "筛选结果",
        value: String(filteredBindings.length),
        note: `总记录 ${state.bindings.length}`,
      },
      {
        label: "已绑定",
        value: String(activeCount),
        note: "可直接接收飞书卡片",
      },
      {
        label: "待确认",
        value: String(pendingCount),
        note: "需补齐身份映射",
      },
      {
        label: "已停用",
        value: String(disabledCount),
        note: "仅保留历史记录",
      },
    ];
  }, [filteredBindings, state.bindings.length]);

  const cardFieldMappings = useMemo(() => {
    if (!selectedCard) {
      return [];
    }
    const baseMappings: Array<{ uiField: string; contractField: string; note: string }> = [
      { uiField: "title", contractField: "title", note: "卡片主标题" },
      { uiField: "subtitle", contractField: "currentNodeName / subtitle", note: "卡片副标题或节点摘要" },
      { uiField: "summaryLines", contractField: "summary / summaryLines", note: "正文摘要区，最多 2-3 行" },
      { uiField: "fields", contractField: "customerName / stage / status 等聚合字段", note: "结构化信息区" },
      { uiField: "actions", contractField: "action / approvalInstanceId / businessType / businessId", note: "按钮与动作载荷" },
    ];

    if (selectedCard.templateKey === "daily_brief") {
      return [
        ...baseMappings,
        {
          uiField: "tags",
          contractField: "generatedBy / date / summaryLines",
          note: "简报来源和日期标签",
        },
      ];
    }

    return [
      ...baseMappings,
      {
        uiField: "businessCode",
        contractField: "businessCode / code",
        note: "商机或方案编号",
      },
      {
        uiField: "businessTypeLabel",
        contractField: "businessType",
        note: "业务类型展示名",
      },
    ];
  }, [selectedCard]);

  const selectedAction = useMemo(
    () =>
      selectedCard?.actions.find((item) => item.key === selectedActionKey) ??
      selectedCard?.actions[0],
    [selectedActionKey, selectedCard],
  );

  const selectedActionPayload = useMemo(() => {
    if (!selectedCard || !selectedAction) {
      return "";
    }

    const payload = {
      actionKey: selectedAction.key,
      actionType: selectedAction.type,
      templateKey: selectedCard.templateKey,
      businessCode: selectedCard.businessCode ?? null,
      businessType: selectedCard.businessTypeLabel ?? null,
      operator: currentUser?.username ?? "anonymous",
      event: selectedAction.type === "action" ? "card.action.triggered" : "card.link.redirect",
      requestBody:
        selectedAction.type === "action"
          ? {
              action: selectedAction.action ?? "open_detail",
              approvalInstanceId:
                selectedCard.templateKey === "pending_approval"
                  ? `appr_${selectedCard.id}`
                  : null,
              source: "feishu_mvp_card",
            }
          : {
              target: `/business/${selectedCard.businessCode ?? selectedCard.id}`,
              openMode: "webview",
            },
    };

    return JSON.stringify(payload, null, 2);
  }, [currentUser?.username, selectedAction, selectedCard]);

  const actionPayloadRows = useMemo(() => {
    if (!selectedCard) {
      return [];
    }
    return selectedCard.actions.map((action) => ({
      key: action.key,
      label: action.label,
      type: action.type,
      enabled: action.enabled ? "是" : "否",
      action: action.action ?? "open_detail",
    }));
  }, [selectedCard]);

  const buildAuthHeaders = (withJson = true) => {
    const headers: Record<string, string> = {};
    if (withJson) {
      headers["Content-Type"] = "application/json";
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  };

  const bindingColumns: ColumnsType<FeishuBindingRecord> = [
    {
      title: "飞书姓名",
      dataIndex: "feishuName",
      key: "feishuName",
      width: 140,
    },
    {
      title: "Open ID",
      dataIndex: "feishuOpenId",
      key: "feishuOpenId",
      width: 240,
      render: (value: string) => (
        <Text code style={{ fontSize: 12 }}>
          {value}
        </Text>
      ),
    },
    {
      title: "平台账号",
      key: "platform",
      width: 160,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.platformUsername}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            User ID: {record.platformUserId}
          </Text>
        </div>
      ),
    },
    {
      title: "部门",
      dataIndex: "department",
      key: "department",
      width: 140,
    },
    {
      title: "来源",
      dataIndex: "bindingSource",
      key: "bindingSource",
      width: 100,
      render: (value: FeishuBindingRecord["bindingSource"]) => (
        <Tag color={value === "manual" ? "blue" : value === "import" ? "purple" : "default"}>
          {value}
        </Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (value: FeishuBindingStatus) => (
        <Tag color={getStatusColor(value)}>{getStatusLabel(value)}</Tag>
      ),
    },
    {
      title: "最近更新",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 140,
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_, record) => (
        <Space size={4} wrap>
          <Button size="small" onClick={() => void handleToggleBindingStatus(record)}>
            {record.status === "disabled" ? "启用" : "停用"}
          </Button>
        </Space>
      ),
    },
  ];

  const commandColumns: ColumnsType<FeishuCommandPreview> = [
    {
      title: "命令",
      dataIndex: "command",
      key: "command",
      width: 180,
      render: (value: string) => <Text code>{value}</Text>,
    },
    {
      title: "说明",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "目标接口",
      dataIndex: "targetEndpoint",
      key: "targetEndpoint",
      width: 280,
      render: (value: string) => <Text code>{value}</Text>,
    },
    {
      title: "返回类型",
      dataIndex: "responseType",
      key: "responseType",
      width: 140,
      render: (value: FeishuCommandPreview["responseType"]) => (
        <Tag color={value === "interactive_card" ? "cyan" : "geekblue"}>{value}</Tag>
      ),
    },
  ];

  const loadBindingsFromServer = async () => {
    if (!accessToken) {
      message.info("当前未检测到登录令牌，继续显示本地 Mock 数据。");
      return;
    }
    try {
      const response = await fetch(buildApiUrl("/integrations/feishu/bindings"), {
        headers: buildAuthHeaders(false),
      });
      if (!response.ok) {
        message.warning(`飞书绑定接口返回 ${response.status}，当前继续显示本地 Mock 数据。`);
        return;
      }
      const payload = (await response.json()) as {
        items?: FeishuBindingRecord[];
      };
      if (!Array.isArray(payload.items)) {
        message.warning("飞书绑定接口返回格式不符合预期，已回退到本地 Mock 数据。");
        return;
      }
      const nextState = {
        ...state,
        bindings: payload.items,
      };
      setState(nextState);
      saveFeishuIntegrationMockState(nextState);
      message.success("已从后端加载飞书绑定示例接口。");
    } catch {
      message.warning("未能连接飞书绑定接口，当前继续显示本地 Mock 数据。");
    }
  };

  const handleCreateBinding = async () => {
    const values = await form.validateFields();
    const payload = {
      feishuOpenId: values.feishuOpenId.trim(),
      feishuName: values.feishuName.trim(),
      platformUserId: Number(values.platformUserId),
      status: "pending",
    };

    if (accessToken) {
      try {
        const response = await fetch(buildApiUrl("/integrations/feishu/bindings"), {
          method: "POST",
          headers: buildAuthHeaders(),
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const created = (await response.json()) as FeishuBindingRecord;
          const nextState = {
            ...state,
            bindings: [created, ...state.bindings.filter((item) => item.id !== created.id)],
          };
          setState(nextState);
          saveFeishuIntegrationMockState(nextState);
          form.resetFields();
          message.success("已通过后端接口新增飞书绑定。");
          return;
        }
        message.warning(`新增绑定接口返回 ${response.status}，已回退到本地 Mock。`);
      } catch {
        message.warning("新增绑定接口调用失败，已回退到本地 Mock。");
      }
    }

    const nextRecord: FeishuBindingRecord = {
      id: `binding-${Date.now()}`,
      feishuName: values.feishuName.trim(),
      feishuOpenId: values.feishuOpenId.trim(),
      platformUserId: Number(values.platformUserId),
      platformUsername: values.platformUsername.trim(),
      department: values.department.trim(),
      bindingSource: "manual",
      status: "pending",
      updatedAt: "2026-04-03 11:30",
    };
    const nextState = {
      ...state,
      bindings: [nextRecord, ...state.bindings],
    };
    setState(nextState);
    saveFeishuIntegrationMockState(nextState);
    form.resetFields();
    message.success("已新增一条飞书绑定 Mock 记录。");
  };

  const handleToggleBindingStatus = async (record: FeishuBindingRecord) => {
    const nextStatus: FeishuBindingStatus =
      record.status === "disabled" ? "active" : "disabled";

    if (accessToken && typeof record.id === "number") {
      try {
        const response = await fetch(
          buildApiUrl(`/integrations/feishu/bindings/${record.id}`),
          {
            method: "PATCH",
            headers: buildAuthHeaders(),
            body: JSON.stringify({ status: nextStatus }),
          },
        );
        if (response.ok) {
          const updated = (await response.json()) as FeishuBindingRecord;
          const nextState = {
            ...state,
            bindings: state.bindings.map((item) =>
              item.id === record.id ? { ...item, ...updated } : item,
            ),
          };
          setState(nextState);
          saveFeishuIntegrationMockState(nextState);
          message.success(
            nextStatus === "active"
              ? `已通过后端接口启用绑定：${record.feishuName}`
              : `已通过后端接口停用绑定：${record.feishuName}`,
          );
          return;
        }
        message.warning(`更新绑定接口返回 ${response.status}，已回退到本地 Mock。`);
      } catch {
        message.warning("更新绑定接口调用失败，已回退到本地 Mock。");
      }
    }

    const nextState = {
      ...state,
      bindings: state.bindings.map((item) =>
        item.id === record.id
          ? {
              ...item,
              status: nextStatus,
              updatedAt: "2026-04-03 11:20",
            }
          : item,
      ),
    };
    setState(nextState);
    saveFeishuIntegrationMockState(nextState);
    message.success(
      nextStatus === "active"
        ? `已重新启用绑定：${record.feishuName}`
        : `已停用绑定：${record.feishuName}`,
    );
  };

  const runCommandPreview = async (command: FeishuCommandPreview) => {
    const requestedAt = new Date().toLocaleString("zh-CN", {
      hour12: false,
    });
    const startTime = Date.now();
    if (!accessToken) {
      setCommandExecutionStatus("error");
      setCommandExecutionMessage("当前未检测到登录令牌，无法请求后端示例接口。");
      setRecentCommandRequest({
        command: command.command,
        endpoint: command.targetEndpoint,
        requestedAt,
        source: "前端令牌检查",
        result: "error",
      });
      message.info("当前未检测到登录令牌，继续展示静态命令口径。");
      return;
    }

    try {
      let endpoint = "";
      if (command.id === "cmd-pending") {
        endpoint = "/integrations/feishu/me/pending-approvals";
      } else if (command.id === "cmd-opportunity") {
        endpoint = "/integrations/feishu/opportunities/OPP-000003/summary";
      } else if (command.id === "cmd-solution") {
        endpoint = "/integrations/feishu/solutions/SOL-000001/summary";
      } else if (command.id === "cmd-brief") {
        endpoint = "/integrations/feishu/me/daily-brief";
      }

      if (!endpoint) {
        return;
      }

      const response = await fetch(buildApiUrl(endpoint), {
        headers: buildAuthHeaders(false),
      });
      if (!response.ok) {
        setCommandExecutionStatus("error");
        setCommandExecutionMessage(`接口返回 ${response.status}，当前保留静态说明。`);
        setRecentCommandRequest({
          command: command.command,
          endpoint: command.targetEndpoint,
          requestedAt,
          source: "后端接口",
          result: "error",
          durationMs: Date.now() - startTime,
        });
        message.warning(`命令预览接口返回 ${response.status}，当前保留静态说明。`);
        return;
      }
      const payload = (await response.json()) as Record<string, unknown>;

      if (command.id === "cmd-pending") {
        const items = Array.isArray(payload.items)
          ? (payload.items as Array<Record<string, unknown>>)
          : [];
        setCommandExecution({
          title: "待我审批接口返回",
          subtitle: `共 ${String(payload.total ?? items.length)} 条`,
          summaryLines:
            items.slice(0, 3).map((item) => String(item.summary || item.title || "")) ||
            [],
          fields: items.slice(0, 3).map((item, index) => ({
            label: `事项 ${index + 1}`,
            value: `${String(item.businessCode || "")} ${String(item.currentNodeName || "")}`,
          })),
        });
        if (items.length === 0) {
          setCommandExecutionStatus("empty");
          setCommandExecutionMessage("接口已返回成功，但当前没有可展示的待审批事项。");
          setRecentCommandRequest({
            command: command.command,
            endpoint: command.targetEndpoint,
            requestedAt,
            source: "后端接口",
            result: "empty",
            durationMs: Date.now() - startTime,
          });
        } else {
          setCommandExecutionStatus("success");
          setCommandExecutionMessage("已成功获取待我审批示例数据。");
          setRecentCommandRequest({
            command: command.command,
            endpoint: command.targetEndpoint,
            requestedAt,
            source: "后端接口",
            result: "success",
            durationMs: Date.now() - startTime,
          });
        }
      } else if (command.id === "cmd-opportunity") {
        setCommandExecution({
          title: String(payload.name || "商机摘要"),
          subtitle: String(payload.code || ""),
          summaryLines: Array.isArray(payload.riskSummary)
            ? payload.riskSummary.map((item) => String(item))
            : [],
          fields: [
            { label: "客户", value: String(payload.customerName || "-") },
            { label: "阶段", value: String(payload.stage || "-") },
            { label: "审批节点", value: String(payload.currentApprovalNodeName || "-") },
          ],
        });
        setCommandExecutionStatus("success");
        setCommandExecutionMessage("已成功获取商机摘要示例数据。");
        setRecentCommandRequest({
          command: command.command,
          endpoint: command.targetEndpoint,
          requestedAt,
          source: "后端接口",
          result: "success",
          durationMs: Date.now() - startTime,
        });
      } else if (command.id === "cmd-solution") {
        setCommandExecution({
          title: String(payload.name || "方案摘要"),
          subtitle: String(payload.code || ""),
          summaryLines: [String(payload.summary || payload.latestReviewConclusion || "暂无摘要")],
          fields: [
            { label: "关联商机", value: String(payload.opportunityCode || "-") },
            { label: "状态", value: String(payload.status || "-") },
            { label: "审批节点", value: String(payload.currentApprovalNodeName || "-") },
          ],
        });
        setCommandExecutionStatus("success");
        setCommandExecutionMessage("已成功获取方案摘要示例数据。");
        setRecentCommandRequest({
          command: command.command,
          endpoint: command.targetEndpoint,
          requestedAt,
          source: "后端接口",
          result: "success",
          durationMs: Date.now() - startTime,
        });
      } else if (command.id === "cmd-brief") {
        setCommandExecution({
          title: "今日简报接口返回",
          subtitle: String(payload.date || ""),
          summaryLines: Array.isArray(payload.summaryLines)
            ? payload.summaryLines.map((item) => String(item))
            : [],
          fields: [
            { label: "待审批总数", value: String(payload.pendingApprovalCount || 0) },
            { label: "高风险商机", value: String(payload.inRiskOpportunityCount || 0) },
            { label: "今日更新方案", value: String(payload.updatedSolutionCount || 0) },
          ],
        });
        setCommandExecutionStatus("success");
        setCommandExecutionMessage("已成功获取今日简报示例数据。");
        setRecentCommandRequest({
          command: command.command,
          endpoint: command.targetEndpoint,
          requestedAt,
          source: "后端接口",
          result: "success",
          durationMs: Date.now() - startTime,
        });
      }

      message.success(`已从后端刷新命令示例：${command.command}`);
    } catch {
      setCommandExecutionStatus("error");
      setCommandExecutionMessage("命令示例接口调用失败，当前保留静态预览。");
      setRecentCommandRequest({
        command: command.command,
        endpoint: command.targetEndpoint,
        requestedAt,
        source: "后端接口",
        result: "error",
        durationMs: Date.now() - startTime,
      });
      message.warning("命令示例接口调用失败，当前保留静态预览。");
    }
  };

  const refreshCardPreviewFromApi = async () => {
    const targetCommand =
      selectedCard?.templateKey === "pending_approval"
        ? state.commands.find((item) => item.id === "cmd-pending")
        : selectedCard?.templateKey === "opportunity_summary"
          ? state.commands.find((item) => item.id === "cmd-opportunity")
          : selectedCard?.templateKey === "solution_summary"
            ? state.commands.find((item) => item.id === "cmd-solution")
            : state.commands.find((item) => item.id === "cmd-brief");

    if (!targetCommand) {
      return;
    }
    await runCommandPreview(targetCommand);
  };

  const handleReset = () => {
    const nextState = createDefaultFeishuIntegrationState();
    setState(nextState);
    setSelectedCardId(nextState.cards[0]?.id ?? "");
    saveFeishuIntegrationMockState(nextState);
    form.resetFields();
    message.success("已恢复飞书集成默认演示数据。");
  };

  const cardOptions = state.cards.map((item) => ({
    label: item.title,
    value: item.id,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--app-text-primary)" }}>
              飞书集成
            </div>
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              当前按“前端优先、后端接口预留”推进。这个页面先用于验证绑定管理、命令口径、
              卡片字段和平台落位方式，后续再对接真实 `integrations/feishu` 后端模块。
            </Paragraph>
          </div>
          <Space wrap>
            <Tag color="cyan">MVP 阶段</Tag>
            <Tag color="blue">前端原型优先</Tag>
            <Tag color="purple">后端接口待接入</Tag>
          </Space>
        </div>
      </Card>

      <Alert
        type="info"
        showIcon
        message="当前页面为前端原型"
        description={`当前登录账号：${currentUser?.displayName || currentUser?.username || "未登录用户"}。本阶段只做平台内配置、绑定管理和飞书卡片预览；页面已支持优先从后端读取 bindings 示例接口，若失败则自动回退到本地 Mock。`}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title="绑定管理（Mock / API）"
            extra={
              <Space wrap>
                <Button onClick={() => void loadBindingsFromServer()}>
                  从后端加载
                </Button>
                <Button onClick={handleReset}>恢复默认演示数据</Button>
              </Space>
            }
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <Input
                value={bindingKeyword}
                onChange={(event) => setBindingKeyword(event.target.value)}
                placeholder="搜索飞书姓名 / Open ID / 平台账号 / 部门"
                style={{ flex: 1, minWidth: 220 }}
              />
              <Select
                value={bindingStatusFilter}
                onChange={(value) => setBindingStatusFilter(value)}
                style={{ width: 140 }}
                options={[
                  { label: "全部状态", value: "all" },
                  { label: "已绑定", value: "active" },
                  { label: "待确认", value: "pending" },
                  { label: "已停用", value: "disabled" },
                ]}
              />
            </div>
            <Form layout="vertical" form={form}>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label="飞书姓名"
                    name="feishuName"
                    rules={[{ required: true, message: "请输入飞书姓名" }]}
                  >
                    <Input placeholder="例如：王经理" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="飞书 Open ID"
                    name="feishuOpenId"
                    rules={[{ required: true, message: "请输入 Open ID" }]}
                  >
                    <Input placeholder="例如：ou_xxx_demo_user" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="平台用户 ID"
                    name="platformUserId"
                    rules={[{ required: true, message: "请输入平台用户 ID" }]}
                  >
                    <Input placeholder="例如：2" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="平台账号"
                    name="platformUsername"
                    rules={[{ required: true, message: "请输入平台账号" }]}
                  >
                    <Input placeholder="例如：manager_demo" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    label="部门"
                    name="department"
                    rules={[{ required: true, message: "请输入部门" }]}
                  >
                    <Input placeholder="例如：售前管理部" />
                  </Form.Item>
                </Col>
              </Row>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button onClick={() => form.resetFields()}>清空</Button>
                <Button type="primary" onClick={() => void handleCreateBinding()}>
                  新增绑定记录
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            title="MVP 预览台"
            extra={
              <Segmented<PreviewMode>
                value={previewMode}
                onChange={(value) => setPreviewMode(value)}
                options={[
                  { label: "绑定列表", value: "bindings" },
                  { label: "命令口径", value: "commands" },
                  { label: "卡片预览", value: "cards" },
                ]}
              />
            }
          >
            {previewMode === "bindings" &&
              (filteredBindings.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Row gutter={[12, 12]}>
                    {bindingSummary.map((item) => (
                      <Col xs={12} md={6} key={item.label}>
                        <Card size="small" bordered={false} style={{ background: "var(--app-surface-soft)" }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.label}
                          </Text>
                          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
                            {item.value}
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.note}
                          </Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <Text type="secondary">
                      当前排序：{bindingSortKey === "updatedAt_desc"
                        ? "最近更新优先"
                        : bindingSortKey === "updatedAt_asc"
                          ? "最早更新优先"
                          : bindingSortKey === "name_asc"
                            ? "按飞书姓名"
                            : "按部门"}
                    </Text>
                    <Select
                      value={bindingSortKey}
                      onChange={(value) => setBindingSortKey(value)}
                      style={{ width: 180 }}
                      options={[
                        { label: "最近更新优先", value: "updatedAt_desc" },
                        { label: "最早更新优先", value: "updatedAt_asc" },
                        { label: "按飞书姓名", value: "name_asc" },
                        { label: "按部门", value: "department_asc" },
                      ]}
                    />
                  </div>
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={pagedBindings}
                    columns={bindingColumns}
                    scroll={{ x: 980 }}
                    pagination={{
                      current: bindingPage,
                      pageSize: bindingPageSize,
                      total: filteredBindings.length,
                      showSizeChanger: true,
                      pageSizeOptions: ["5", "10", "20"],
                      showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                      onChange: (page, pageSize) => {
                        setBindingPage(page);
                        setBindingPageSize(pageSize);
                      },
                    }}
                  />
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="当前筛选条件下没有匹配的飞书绑定记录"
                />
              ))}

            {previewMode === "commands" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Table
                  size="small"
                  rowKey="id"
                  pagination={false}
                  dataSource={state.commands}
                  columns={[
                    ...commandColumns,
                    {
                      title: "操作",
                      key: "action",
                      width: 120,
                      render: (_, record) => (
                        <Button size="small" onClick={() => void runCommandPreview(record)}>
                          运行示例
                        </Button>
                      ),
                    },
                  ]}
                  scroll={{ x: 980 }}
                />
                {commandExecutionStatus === "error" && (
                  <Alert
                    type="error"
                    showIcon
                    message="命令示例执行失败"
                    description={commandExecutionMessage}
                  />
                )}
                {commandExecutionStatus === "empty" && (
                  <Alert
                    type="info"
                    showIcon
                    message="命令示例执行成功，但暂无数据"
                    description={commandExecutionMessage}
                  />
                )}
                {commandExecutionStatus === "idle" && !commandExecution && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="点击“运行示例”后，这里会展示后端返回的结构化结果。"
                  />
                )}
                {recentCommandRequest && (
                  <Card size="small" title="最近请求信息">
                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          命令
                        </Text>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{recentCommandRequest.command}</div>
                      </Col>
                      <Col xs={24} md={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          请求时间
                        </Text>
                        <div style={{ marginTop: 6, fontWeight: 700 }}>{recentCommandRequest.requestedAt}</div>
                      </Col>
                      <Col xs={24} md={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          目标接口
                        </Text>
                        <div style={{ marginTop: 6 }}>
                          <Text code>{recentCommandRequest.endpoint}</Text>
                        </div>
                      </Col>
                      <Col xs={24} md={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          结果
                        </Text>
                        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Tag
                            color={
                              recentCommandRequest.result === "success"
                                ? "green"
                                : recentCommandRequest.result === "empty"
                                  ? "gold"
                                  : "red"
                            }
                          >
                            {recentCommandRequest.result}
                          </Tag>
                          <Tag>{recentCommandRequest.source}</Tag>
                          {typeof recentCommandRequest.durationMs === "number" && (
                            <Tag color="blue">{recentCommandRequest.durationMs} ms</Tag>
                          )}
                        </div>
                      </Col>
                    </Row>
                  </Card>
                )}
                {commandExecution && (
                  <Card size="small" title={commandExecution.title} extra={commandExecution.subtitle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <Row gutter={[12, 12]}>
                        {commandExecution.fields.map((field) => (
                          <Col xs={24} md={12} key={field.label}>
                            <Card size="small" bordered={false} style={{ background: "var(--app-surface-soft)" }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {field.label}
                              </Text>
                              <div style={{ marginTop: 6, fontWeight: 600 }}>{field.value}</div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                      {commandExecution.summaryLines.map((line) => (
                        <div
                          key={line}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "color-mix(in srgb, var(--app-surface) 86%, var(--app-surface-soft) 14%)",
                            border: "1px solid var(--app-border)",
                          }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {previewMode === "cards" && selectedCard && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Segmented
                  block
                  value={selectedCard.id}
                  onChange={(value) => setSelectedCardId(String(value))}
                  options={state.cards.map((item) => ({
                    label: item.title,
                    value: item.id,
                  }))}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button size="small" onClick={() => void refreshCardPreviewFromApi()}>
                    从后端刷新当前示例
                  </Button>
                </div>

                <Card
                  size="small"
                  style={{
                    borderRadius: 18,
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, rgba(20,184,166,0.12) 68%, var(--app-surface) 32%) 0%, color-mix(in srgb, var(--app-surface-soft) 96%, transparent) 100%)",
                    border: "1px solid color-mix(in srgb, var(--app-accent) 18%, var(--app-border) 82%)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedCard.title}</div>
                        <Text type="secondary">{selectedCard.subtitle}</Text>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {selectedCard.tags.map((tag) => (
                          <Tag key={tag} color="blue">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    </div>

                    <Row gutter={[12, 12]}>
                      {selectedCard.fields.map((field) => (
                        <Col xs={24} md={12} key={field.label}>
                          <Card size="small" bordered={false} style={{ background: "var(--app-surface-soft)" }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {field.label}
                            </Text>
                            <div style={{ marginTop: 6, fontWeight: 600 }}>{field.value}</div>
                          </Card>
                        </Col>
                      ))}
                    </Row>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedCard.summaryLines.map((line) => (
                        <div
                          key={line}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            background: "color-mix(in srgb, var(--app-surface) 86%, var(--app-surface-soft) 14%)",
                            border: "1px solid var(--app-border)",
                          }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {selectedCard.actions.map((action) => (
                        <Button
                          key={action.key}
                          type={action.action === "approve" ? "primary" : "default"}
                          danger={action.action === "reject"}
                          disabled={!action.enabled}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>

                <Alert
                  type="warning"
                  showIcon
                  message="当前卡片只做字段与交互预演"
                  description="MVP 阶段仅“通过 / 驳回”两类简单节点考虑在飞书端执行；上传文档、指派负责人等复杂节点仍会跳回平台处理。"
                />

                <Card size="small" title="字段映射视图">
                  <Table
                    size="small"
                    pagination={false}
                    rowKey={(record) => `${record.uiField}-${record.contractField}`}
                    dataSource={cardFieldMappings}
                    columns={[
                      {
                        title: "页面字段",
                        dataIndex: "uiField",
                        key: "uiField",
                        width: 180,
                        render: (value: string) => <Text code>{value}</Text>,
                      },
                      {
                        title: "接口字段",
                        dataIndex: "contractField",
                        key: "contractField",
                        width: 260,
                        render: (value: string) => <Text code>{value}</Text>,
                      },
                      {
                        title: "说明",
                        dataIndex: "note",
                        key: "note",
                      },
                    ]}
                  />
                </Card>

                <Card
                  size="small"
                  title="动作载荷预览"
                  extra={
                    <Select
                      value={selectedAction?.key}
                      onChange={(value) => setSelectedActionKey(String(value))}
                      style={{ width: 180 }}
                      options={selectedCard.actions.map((item) => ({
                        label: item.label,
                        value: item.key,
                      }))}
                    />
                  }
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Table
                      size="small"
                      pagination={false}
                      rowKey="key"
                      dataSource={actionPayloadRows}
                      columns={[
                        {
                          title: "动作",
                          dataIndex: "label",
                          key: "label",
                          width: 120,
                        },
                        {
                          title: "类型",
                          dataIndex: "type",
                          key: "type",
                          width: 100,
                          render: (value: FeishuCardActionPreview["type"]) => <Tag>{value}</Tag>,
                        },
                        {
                          title: "事件",
                          dataIndex: "action",
                          key: "action",
                          width: 140,
                          render: (value: string) => <Text code>{value}</Text>,
                        },
                        {
                          title: "可用",
                          dataIndex: "enabled",
                          key: "enabled",
                          width: 90,
                        },
                      ]}
                    />
                    <div
                      style={{
                        borderRadius: 14,
                        padding: 14,
                        background: "#0f172a",
                        color: "#dbeafe",
                        overflowX: "auto",
                      }}
                    >
                      <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                        {selectedActionPayload}
                      </pre>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

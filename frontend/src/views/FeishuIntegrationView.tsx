import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "../shared/auth";
import {
  createDefaultFeishuIntegrationState,
  loadFeishuIntegrationMockState,
  saveFeishuIntegrationMockState,
  type FeishuCardActionPreview,
  type FeishuCardPreview,
  type FeishuBindingRecord,
  type FeishuBindingStatus,
  type FeishuCommandPreview,
} from "../shared/feishuIntegrationMock";
import { buildApiUrl } from "../shared/api";

const { Text, Paragraph } = Typography;

const FeishuBindingsPreviewPanel = lazy(() =>
  import("./feishu/FeishuBindingsPreviewPanel").then((module) => ({
    default: module.FeishuBindingsPreviewPanel,
  })),
);

const FeishuCommandsPreviewPanel = lazy(() =>
  import("./feishu/FeishuCommandsPreviewPanel").then((module) => ({
    default: module.FeishuCommandsPreviewPanel,
  })),
);

const FeishuCardsPreviewPanel = lazy(() =>
  import("./feishu/FeishuCardsPreviewPanel").then((module) => ({
    default: module.FeishuCardsPreviewPanel,
  })),
);

const FeishuBindingManagementPanel = lazy(() =>
  import("./feishu/FeishuBindingManagementPanel").then((module) => ({
    default: module.FeishuBindingManagementPanel,
  })),
);

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
type FeishuSummaryField = { label: string; value: string };
const FEISHU_DEMO_OPPORTUNITY_CODE = "OPP-000003";
const FEISHU_DEMO_SOLUTION_CODE = "SOL-000123";

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
  const [sendCardForm] = Form.useForm();
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
  const [sendingApprovalCard, setSendingApprovalCard] = useState(false);
  const [approvalCardSendResult, setApprovalCardSendResult] = useState<{
    mode: string;
    receiverOpenId?: string;
    approvalInstanceId?: number;
    messageId?: string;
    cardTitle?: string;
    requestModeLabel: string;
  } | null>(null);

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

  const getEffectiveAccessToken = () => {
    if (accessToken) {
      return accessToken;
    }
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem("accessToken");
  };

  const buildAuthHeaders = (withJson = true) => {
    const headers: Record<string, string> = {};
    if (withJson) {
      headers["Content-Type"] = "application/json";
    }
    const token = getEffectiveAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const updateCardPreview = (
    cardId: string,
    updater: (currentCard: FeishuCardPreview) => FeishuCardPreview,
  ) => {
    setState((previousState) => {
      const nextCards = previousState.cards.map((card) =>
        card.id === cardId ? updater(card) : card,
      );
      const nextState = {
        ...previousState,
        cards: nextCards,
      };
      saveFeishuIntegrationMockState(nextState);
      return nextState;
    });
  };

  const buildSummaryFields = (payload: Record<string, unknown>) => {
    const entries: FeishuSummaryField[] = [];
    const candidateFields: Array<[string, string]> = [
      ["客户", String(payload.customerName ?? "")],
      ["阶段", String(payload.stage ?? "")],
      ["状态", String(payload.status ?? "")],
      ["当前节点", String(payload.currentApprovalNodeName ?? "")],
      ["最近审批意见", String(payload.latestReviewConclusion ?? "")],
    ];

    candidateFields.forEach(([label, value]) => {
      if (value && value !== "-") {
        entries.push({ label, value });
      }
    });

    return entries.slice(0, 3);
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
    const token = getEffectiveAccessToken();
    if (!token) {
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

    if (getEffectiveAccessToken()) {
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

    if (getEffectiveAccessToken() && typeof record.id === "number") {
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
    if (!getEffectiveAccessToken()) {
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
        endpoint = `/integrations/feishu/opportunities/${FEISHU_DEMO_OPPORTUNITY_CODE}/summary`;
      } else if (command.id === "cmd-solution") {
        endpoint = `/integrations/feishu/solutions/${FEISHU_DEMO_SOLUTION_CODE}/summary`;
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
    if (!selectedCard) {
      return;
    }

    const requestedAt = new Date().toLocaleString("zh-CN", {
      hour12: false,
    });
    const startTime = Date.now();

    if (!getEffectiveAccessToken()) {
      message.info("当前未检测到登录令牌，继续显示当前卡片示例。");
      return;
    }

    try {
      let endpoint = "";
      let successMessage = "";

      if (selectedCard.templateKey === "pending_approval") {
        endpoint = "/integrations/feishu/me/pending-approvals";
        successMessage = "已从后端刷新待审批卡片示例。";
      } else if (selectedCard.templateKey === "opportunity_summary") {
        endpoint = `/integrations/feishu/opportunities/${selectedCard.businessCode || FEISHU_DEMO_OPPORTUNITY_CODE}/summary`;
        successMessage = "已从后端刷新商机摘要卡片示例。";
      } else if (selectedCard.templateKey === "solution_summary") {
        endpoint = `/integrations/feishu/solutions/${selectedCard.businessCode || FEISHU_DEMO_SOLUTION_CODE}/summary`;
        successMessage = "已从后端刷新方案摘要卡片示例。";
      } else {
        endpoint = "/integrations/feishu/me/daily-brief";
        successMessage = "已从后端刷新今日简报卡片示例。";
      }

      const response = await fetch(buildApiUrl(endpoint), {
        headers: buildAuthHeaders(false),
      });
      if (!response.ok) {
        message.warning(`卡片示例接口返回 ${response.status}，当前保留已有预览。`);
        return;
      }

      const payload = (await response.json()) as Record<string, unknown>;

      if (selectedCard.templateKey === "pending_approval") {
        const items = Array.isArray(payload.items)
          ? (payload.items as Array<Record<string, unknown>>)
          : [];
        if (items.length === 0) {
          message.info("后端已返回成功，但当前账号暂无待审批事项，保留现有卡片示例。");
          return;
        }

        const firstItem = items[0] ?? {};
        updateCardPreview(selectedCard.id, (currentCard) => ({
          ...currentCard,
          title: String(firstItem.title ?? currentCard.title),
          subtitle: String(
            firstItem.currentNodeName
              ? `当前节点：${String(firstItem.currentNodeName)}`
              : currentCard.subtitle,
          ),
          businessCode: String(firstItem.businessCode ?? currentCard.businessCode ?? ""),
          businessTypeLabel: String(
            firstItem.businessType ?? currentCard.businessTypeLabel ?? "审批事项",
          ),
          summaryLines:
            typeof firstItem.summary === "string" && firstItem.summary
              ? [
                  String(firstItem.summary),
                  `请求时间：${requestedAt}`,
                ]
              : currentCard.summaryLines,
          fields: [
            {
              label: "客户",
              value: String(firstItem.customerName ?? currentCard.fields[0]?.value ?? "-"),
            },
            {
              label: "发起人",
              value: String(firstItem.createdByName ?? currentCard.fields[1]?.value ?? "-"),
            },
            {
              label: "最近更新时间",
              value: requestedAt,
            },
          ],
        }));
      } else if (selectedCard.templateKey === "daily_brief") {
        const summaryLines = Array.isArray(payload.summaryLines)
          ? payload.summaryLines.map((item) => String(item))
          : [];
        updateCardPreview(selectedCard.id, (currentCard) => ({
          ...currentCard,
          title:
            currentUser?.displayName || currentUser?.username
              ? `今日简报：${currentUser.displayName || currentUser.username}`
              : currentCard.title,
          subtitle: `工作日 ${requestedAt.split(" ").at(-1) ?? "09:00"} 实时刷新`,
          summaryLines: summaryLines.length > 0 ? summaryLines : currentCard.summaryLines,
          fields: [
            { label: "待审批总数", value: String(payload.pendingApprovalCount ?? 0) },
            { label: "高风险商机", value: String(payload.inRiskOpportunityCount ?? 0) },
            { label: "今日更新方案", value: String(payload.updatedSolutionCount ?? 0) },
          ],
        }));
      } else {
        const summaryLines =
          selectedCard.templateKey === "solution_summary"
            ? [String(payload.summary ?? payload.latestReviewConclusion ?? "暂无摘要")]
            : Array.isArray(payload.riskSummary)
              ? payload.riskSummary.map((item) => String(item))
              : [];

        updateCardPreview(selectedCard.id, (currentCard) => ({
          ...currentCard,
          title: `${selectedCard.templateKey === "solution_summary" ? "方案摘要" : "商机摘要"}：${String(payload.code ?? currentCard.businessCode ?? "")} ${String(payload.name ?? "")}`.trim(),
          subtitle:
            selectedCard.templateKey === "solution_summary"
              ? `状态 ${String(payload.status ?? currentCard.subtitle)}`
              : "平台后端聚合摘要卡片",
          businessCode: String(payload.code ?? currentCard.businessCode ?? ""),
          summaryLines: summaryLines.length > 0 ? summaryLines : currentCard.summaryLines,
          fields: buildSummaryFields(payload).length > 0 ? buildSummaryFields(payload) : currentCard.fields,
        }));
      }

      setRecentCommandRequest({
        command: selectedCard.title,
        endpoint: `GET /api${endpoint}`,
        requestedAt,
        source: "卡片预览刷新",
        result: "success",
        durationMs: Date.now() - startTime,
      });
      message.success(successMessage);
    } catch {
      message.warning("卡片示例接口调用失败，当前保留已有预览。");
    }
  };

  const handleReset = () => {
    const nextState = createDefaultFeishuIntegrationState();
    setState(nextState);
    setSelectedCardId(nextState.cards[0]?.id ?? "");
    saveFeishuIntegrationMockState(nextState);
    form.resetFields();
    sendCardForm.resetFields();
    setApprovalCardSendResult(null);
    message.success("已恢复飞书集成默认演示数据。");
  };

  const handleSendApprovalCard = async () => {
    const values = await sendCardForm.validateFields();
    if (!getEffectiveAccessToken()) {
      message.warning("当前未检测到登录令牌，无法调用审批卡片发送接口。");
      return;
    }

    const payload = {
      approvalInstanceId: Number(values.approvalInstanceId),
      bindingId:
        typeof values.bindingId === "number" && Number.isFinite(values.bindingId)
          ? values.bindingId
          : undefined,
      openId: typeof values.openId === "string" && values.openId.trim() ? values.openId.trim() : undefined,
      dryRun: values.dryRun !== false,
    };

    setSendingApprovalCard(true);
    try {
      const response = await fetch(
        buildApiUrl("/integrations/feishu/messages/approval-cards/send"),
        {
          method: "POST",
          headers: buildAuthHeaders(),
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `审批卡片发送接口返回 ${response.status}`);
      }

      const result = (await response.json()) as {
        mode?: string;
        receiverOpenId?: string;
        approvalInstanceId?: number;
        messageId?: string;
        card?: { title?: string };
      };
      setApprovalCardSendResult({
        mode: result.mode || "unknown",
        receiverOpenId: result.receiverOpenId,
        approvalInstanceId: result.approvalInstanceId,
        messageId: result.messageId,
        cardTitle: result.card?.title,
        requestModeLabel: payload.dryRun ? "Dry Run 预览" : "真实发送",
      });
      message.success(payload.dryRun ? "审批卡片预览已生成。" : "审批卡片发送请求已完成。");
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "审批卡片发送失败";
      setApprovalCardSendResult({
        mode: "failed",
        requestModeLabel: "请求失败",
      });
      message.error(nextMessage);
    } finally {
      setSendingApprovalCard(false);
    }
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
              当前页面已进入“平台页联调 + 后端能力验收”阶段。这里不仅用于绑定管理、
              命令口径和卡片字段验收，也可以直接调用现有 `integrations/feishu`
              接口验证只读摘要与审批卡片发送链路。
            </Paragraph>
          </div>
          <Space wrap>
            <Tag color="cyan">MVP 阶段</Tag>
            <Tag color="blue">平台页联调</Tag>
            <Tag color="green">只读接口已接通</Tag>
            <Tag color="purple">审批卡片可预演</Tag>
          </Space>
        </div>
      </Card>

      <Alert
        type="info"
        showIcon
        message="当前页面已支持后端联调"
        description={`当前登录账号：${currentUser?.displayName || currentUser?.username || "未登录用户"}。绑定管理、只读摘要/简报接口和卡片预览刷新均会优先请求后端；若接口失败，页面才回退到本地 Mock。管理员/经理还可在下方直接预演审批卡片发送接口。`}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Suspense fallback={null}>
            <FeishuBindingManagementPanel
              bindingKeyword={bindingKeyword}
              bindingStatusFilter={bindingStatusFilter}
              form={form}
              onBindingKeywordChange={setBindingKeyword}
              onBindingStatusFilterChange={setBindingStatusFilter}
              onCreateBinding={handleCreateBinding}
              onLoadBindingsFromServer={loadBindingsFromServer}
              onReset={handleReset}
            />
          </Suspense>

          <Card
            title="审批卡片联调"
            style={{ marginTop: 16 }}
            extra={<Tag color="gold">管理员 / 经理</Tag>}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                直接调用 `POST /integrations/feishu/messages/approval-cards/send`。默认使用
                `dryRun` 只生成卡片预览，不真正向飞书发消息。
              </Paragraph>

              <Form
                form={sendCardForm}
                layout="vertical"
                initialValues={{ dryRun: true }}
              >
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      label="审批实例 ID"
                      name="approvalInstanceId"
                      rules={[{ required: true, message: "请输入审批实例 ID" }]}
                    >
                      <InputNumber
                        min={1}
                        style={{ width: "100%" }}
                        placeholder="例如：1"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="绑定记录 ID" name="bindingId">
                      <InputNumber
                        min={1}
                        style={{ width: "100%" }}
                        placeholder="可选：优先按绑定记录发送"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="接收人 Open ID" name="openId">
                      <Input placeholder="可选：直接指定飞书 open_id" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="dryRun" valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Checkbox>仅做 Dry Run 预览，不真实发送</Checkbox>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>

              <Space wrap>
                <Button
                  type="primary"
                  loading={sendingApprovalCard}
                  onClick={() => void handleSendApprovalCard()}
                >
                  执行发送联调
                </Button>
                <Button onClick={() => sendCardForm.resetFields()}>清空参数</Button>
              </Space>

              {approvalCardSendResult ? (
                <Alert
                  type={approvalCardSendResult.mode === "failed" ? "error" : "success"}
                  showIcon
                  message={`${approvalCardSendResult.requestModeLabel} · ${approvalCardSendResult.mode}`}
                  description={[
                    approvalCardSendResult.approvalInstanceId
                      ? `审批实例：${approvalCardSendResult.approvalInstanceId}`
                      : "",
                    approvalCardSendResult.receiverOpenId
                      ? `接收人：${approvalCardSendResult.receiverOpenId}`
                      : "",
                    approvalCardSendResult.cardTitle
                      ? `卡片标题：${approvalCardSendResult.cardTitle}`
                      : "",
                    approvalCardSendResult.messageId
                      ? `消息 ID：${approvalCardSendResult.messageId}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                />
              ) : null}
            </div>
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
            <Suspense fallback={null}>
              {previewMode === "bindings" && (
                <FeishuBindingsPreviewPanel
                  filteredBindings={filteredBindings}
                  bindingSummary={bindingSummary}
                  bindingSortKey={bindingSortKey}
                  onBindingSortKeyChange={setBindingSortKey}
                  pagedBindings={pagedBindings}
                  bindingColumns={bindingColumns}
                  bindingPage={bindingPage}
                  bindingPageSize={bindingPageSize}
                  onBindingPaginationChange={(page, pageSize) => {
                    setBindingPage(page);
                    setBindingPageSize(pageSize);
                  }}
                />
              )}
            </Suspense>

            <Suspense fallback={null}>
              {previewMode === "commands" && (
                <FeishuCommandsPreviewPanel
                  commands={state.commands}
                  commandColumns={commandColumns}
                  onRunCommandPreview={runCommandPreview}
                  commandExecutionStatus={commandExecutionStatus}
                  commandExecutionMessage={commandExecutionMessage}
                  recentCommandRequest={recentCommandRequest}
                  commandExecution={commandExecution}
                />
              )}
            </Suspense>

            <Suspense fallback={null}>
              {previewMode === "cards" && selectedCard && (
                <FeishuCardsPreviewPanel
                  cards={state.cards}
                  selectedCard={selectedCard}
                  selectedAction={selectedAction}
                  selectedCardId={selectedCard.id}
                  onSelectedCardIdChange={setSelectedCardId}
                  onRefreshCardPreview={refreshCardPreviewFromApi}
                  cardFieldMappings={cardFieldMappings}
                  selectedActionKey={selectedActionKey}
                  onSelectedActionKeyChange={setSelectedActionKey}
                  actionPayloadRows={actionPayloadRows}
                  selectedActionPayload={selectedActionPayload}
                />
              )}
            </Suspense>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

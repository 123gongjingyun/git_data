import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Modal,
  Popover,
  Checkbox,
  Divider,
  message,
} from "antd";
import { useEffect, useRef, useState } from "react";
import {
  loadSharedDemoOpportunities,
  OPPORTUNITY_DEMO_UPDATED_EVENT,
  type DemoOpportunity,
  getSelectableOwnerOptions,
} from "../shared/opportunityDemoData";
import {
  deriveContractsFromOpportunities,
  mergeByKey,
  type ContractItem,
  type SignatureStatus,
} from "../shared/pipelineMock";
import {
  getDefaultTablePreference,
  getVisibleToggleableKeys,
  loadTablePreference,
  normalizeTableWidths,
  ResizableHeaderCell,
  type TableColumnMeta,
  type TablePreference,
} from "../shared/tablePreferences";
import { hasActionAccess, hasPermission, type CurrentUser } from "../shared/auth";
import { syncSharedOpportunitiesFromApi } from "../shared/realOpportunities";

const { Paragraph, Text } = Typography;

const CONTRACTS_TABLE_STORAGE_KEY = "contractsTablePreference";
const CONTRACTS_OVERRIDE_STORAGE_KEY = "contractsMockOverrides";
const CONTRACTS_DELETED_KEYS_STORAGE_KEY = "contractsDeletedKeys";

const CONTRACTS_TABLE_COLUMN_META = [
  { key: "index", title: "序号", defaultWidth: 72, minWidth: 72, visibleByDefault: true, locked: true, resizable: false },
  { key: "name", title: "合同名称", defaultWidth: 220, minWidth: 180, visibleByDefault: true, locked: true, resizable: true },
  { key: "projectName", title: "关联项目", defaultWidth: 220, minWidth: 180, visibleByDefault: true, locked: false, resizable: true },
  { key: "customer", title: "客户", defaultWidth: 180, minWidth: 140, visibleByDefault: true, locked: false, resizable: true },
  { key: "salesOwner", title: "销售负责人", defaultWidth: 160, minWidth: 130, visibleByDefault: true, locked: false, resizable: true },
  { key: "preSalesOwner", title: "售前负责人", defaultWidth: 160, minWidth: 130, visibleByDefault: true, locked: false, resizable: true },
  { key: "amount", title: "合同金额", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "paymentTerm", title: "付款条件", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "signDate", title: "签约日期", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "signatureStatus", title: "签名状态", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "status", title: "状态", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "action", title: "操作", defaultWidth: 220, minWidth: 220, visibleByDefault: true, locked: true, resizable: false },
] as const satisfies readonly TableColumnMeta<string>[];

type ContractColumnKey = (typeof CONTRACTS_TABLE_COLUMN_META)[number]["key"];

function loadStoredList<T>(storageKey: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredList<T>(storageKey: string, value: T[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

interface ContractsViewProps {
  currentUser?: CurrentUser | null;
  initialKeyword?: string | null;
  onNavigateToProjects?: (projectName?: string) => void;
}

export function ContractsView(props: ContractsViewProps) {
  const { currentUser, initialKeyword, onNavigateToProjects } = props;
  const canManageContracts = hasPermission(
    currentUser || null,
    "contract.manage",
  );
  const canDeleteContracts = hasActionAccess(
    currentUser || null,
    "contract.delete",
  );

  const [sharedOpportunities, setSharedOpportunities] = useState<
    DemoOpportunity[]
  >(() => loadSharedDemoOpportunities());
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [keyword, setKeyword] = useState<string>(
    initialKeyword?.trim() || "",
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [contractOverrides, setContractOverrides] = useState<ContractItem[]>(
    () => loadStoredList<ContractItem>(CONTRACTS_OVERRIDE_STORAGE_KEY),
  );
  const [deletedContractKeys, setDeletedContractKeys] = useState<string[]>(
    () => loadStoredList<string>(CONTRACTS_DELETED_KEYS_STORAGE_KEY),
  );
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewContract, setViewContract] = useState<ContractItem | null>(null);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [approvalTarget, setApprovalTarget] =
    useState<ContractItem | null>(null);
  const [approvalOpinion, setApprovalOpinion] = useState<string>("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [signedAmountModalVisible, setSignedAmountModalVisible] =
    useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tablePreference, setTablePreference] = useState<
    TablePreference<ContractColumnKey>
  >(() =>
    loadTablePreference(
      CONTRACTS_TABLE_STORAGE_KEY,
      CONTRACTS_TABLE_COLUMN_META,
      true,
    ),
  );
  const baseContracts = deriveContractsFromOpportunities(sharedOpportunities);
  const baseContractKeys = new Set(baseContracts.map((item) => item.key));
  const contracts = mergeByKey(baseContracts, contractOverrides).filter(
    (item) => !deletedContractKeys.includes(item.key),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DemoOpportunity[]>;
      if (Array.isArray(customEvent.detail)) {
        setSharedOpportunities(customEvent.detail);
        return;
      }
      setSharedOpportunities(loadSharedDemoOpportunities());
    };
    window.addEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  useEffect(() => {
    void syncSharedOpportunitiesFromApi().then((items) => {
      if (items) {
        setSharedOpportunities(items);
      }
    });
  }, []);

  useEffect(() => {
    setKeyword(initialKeyword?.trim() || "");
  }, [initialKeyword]);

  const upsertContractOverride = (nextItem: ContractItem) => {
    setContractOverrides((prev) => {
      const exists = prev.some((item) => item.key === nextItem.key);
      return exists
        ? prev.map((item) => (item.key === nextItem.key ? nextItem : item))
        : [nextItem, ...prev];
    });
  };

  const filteredContracts = contracts.filter((c) => {
    if (statusFilter && statusFilter.length > 0) {
      if (c.status !== statusFilter) {
        return false;
      }
    }
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().toLowerCase();
      const name = c.name.toLowerCase();
      const customer = c.customer.toLowerCase();
      if (!name.includes(k) && !customer.includes(k)) {
        return false;
      }
    }
    return true;
  });
  const paginatedContracts = filteredContracts.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const getStatusTag = (status: ContractItem["status"]) => {
    if (status === "signed") {
      return <Tag color="green">已签约</Tag>;
    }
    if (status === "executing") {
      return <Tag color="blue">执行中</Tag>;
    }
    if (status === "reviewing") {
      return <Tag color="orange">审核中</Tag>;
    }
    return <Tag>草稿</Tag>;
  };

  const getSignatureTag = (status: SignatureStatus) => {
    if (status === "signed") {
      return <Tag color="green">已签署</Tag>;
    }
    if (status === "pending") {
      return <Tag color="gold">签署中</Tag>;
    }
    return <Tag>未发起</Tag>;
  };

  const parseAmount = (value: string): number => {
    const cleaned = value.replace(/[¥,万]/g, "");
    const num = Number(cleaned);
    // demo 中金额以“万”为单位展示，这里按“万”汇总
    return Number.isNaN(num) ? 0 : num;
  };

  const totalCount = contracts.length;
  const totalAmountWan = contracts.reduce(
    (sum, c) => sum + parseAmount(c.amount),
    0,
  );
  const signedCount = contracts.filter((c) => c.status === "signed").length;
  const signedAmountWan = contracts
    .filter((c) => c.status === "signed")
    .reduce((sum, c) => sum + parseAmount(c.amount), 0);
  const executingCount = contracts.filter(
    (c) => c.status === "executing",
  ).length;

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredContracts.length, page, pageSize]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        CONTRACTS_TABLE_STORAGE_KEY,
        JSON.stringify(tablePreference),
      );
    } catch {
      // ignore storage errors
    }
  }, [tablePreference]);

  useEffect(() => {
    saveStoredList(CONTRACTS_OVERRIDE_STORAGE_KEY, contractOverrides);
  }, [contractOverrides]);

  useEffect(() => {
    saveStoredList(CONTRACTS_DELETED_KEYS_STORAGE_KEY, deletedContractKeys);
  }, [deletedContractKeys]);

  const handleDeleteContract = (record: ContractItem) => {
    if (!canDeleteContracts) {
      message.warning("当前账号无权删除合同。");
      return;
    }
    Modal.confirm({
      title: `确认删除合同「${record.name}」？`,
      content: "删除后该合同将从当前列表移除，仅影响当前前端数据。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setContractOverrides((prev) => prev.filter((item) => item.key !== record.key));
        if (baseContractKeys.has(record.key)) {
          setDeletedContractKeys((prev) =>
            prev.includes(record.key) ? prev : [record.key, ...prev],
          );
        } else {
          setDeletedContractKeys((prev) =>
            prev.filter((item) => item !== record.key),
          );
        }
        message.success("已删除合同");
      },
    });
  };

  const allColumns = [
    {
      title: "序号",
      key: "index",
      width: 72,
      render: (_: unknown, __: ContractItem, index: number) =>
        (page - 1) * pageSize + index + 1,
    },
    {
      title: "合同名称",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "关联项目",
      dataIndex: "projectName",
      key: "projectName",
      render: (text: string, record: ContractItem) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0 }}
          onClick={() => {
            onNavigateToProjects?.(record.projectName);
          }}
        >
          {text}
        </Button>
      ),
    },
    { title: "客户", dataIndex: "customer", key: "customer" },
    { title: "销售负责人", dataIndex: "salesOwner", key: "salesOwner" },
    { title: "售前负责人", dataIndex: "preSalesOwner", key: "preSalesOwner" },
    { title: "合同金额", dataIndex: "amount", key: "amount" },
    { title: "付款条件", dataIndex: "paymentTerm", key: "paymentTerm" },
    { title: "签约日期", dataIndex: "signDate", key: "signDate" },
    {
      title: "签名状态",
      dataIndex: "signatureStatus",
      key: "signatureStatus",
      render: (value: SignatureStatus) => getSignatureTag(value),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: ContractItem["status"]) => getStatusTag(status),
    },
    {
      title: "操作",
      key: "action",
      render: (_: unknown, record: ContractItem) => (
        <>
          <Button type="link" size="small" onClick={() => { setViewContract(record); setViewModalVisible(true); }}>
            查看
          </Button>
          <Button
            type="link"
            size="small"
            disabled={!canManageContracts}
            onClick={() => {
              if (!canManageContracts) {
                message.warning("当前账号无权审批合同。");
                return;
              }
              setApprovalTarget(record);
              setApprovalOpinion("");
              setApprovalModalVisible(true);
            }}
          >
            {canManageContracts ? "审批" : "查看审批"}
          </Button>
          {record.signatureStatus !== "signed" && (
            <Button
              type="link"
              size="small"
              disabled={!canManageContracts}
              onClick={() => {
                if (!canManageContracts) {
                  message.warning("当前账号无权推进合同签署。");
                  return;
                }
                upsertContractOverride({
                  ...record,
                  signatureStatus: "signed",
                  status:
                    record.status === "draft" || record.status === "reviewing"
                      ? "signed"
                      : record.status,
                });
                void message.success("已完成电子签名");
              }}
            >
              电子签名
            </Button>
          )}
          {record.signatureStatus === "signed" && (
            <Button type="link" size="small" onClick={() => { void message.info("签名状态：已签署"); }}>
              签名状态
            </Button>
          )}
          <Button
            type="link"
            size="small"
            danger
            disabled={!canDeleteContracts}
            onClick={() => handleDeleteContract(record)}
          >
            删除
          </Button>
        </>
      ),
    },
  ];
  const selectedToggleableColumnKeys = getVisibleToggleableKeys(
    CONTRACTS_TABLE_COLUMN_META,
    tablePreference.visibleColumnKeys,
  );
  const columnOptions = CONTRACTS_TABLE_COLUMN_META.filter((item) => !item.locked).map(
    (item) => ({ value: item.key, label: item.title }),
  );
  const columns = allColumns
    .filter((column) =>
      tablePreference.visibleColumnKeys.includes(
        String(column.key || column.dataIndex || "") as ContractColumnKey,
      ),
    )
    .map((column) => {
      const key = String(column.key || column.dataIndex || "") as ContractColumnKey;
      const meta = CONTRACTS_TABLE_COLUMN_META.find((item) => item.key === key);
      const width = tablePreference.columnWidths[key] || meta?.defaultWidth;
      return {
        ...column,
        width,
        onHeaderCell: () => ({
          width,
          minWidth: meta?.minWidth,
          resizable: meta?.resizable,
          onResizeWidth: (nextWidth: number) => {
            setTablePreference((prev) => ({
              ...prev,
              columnWidths: {
                ...prev.columnWidths,
                [key]: nextWidth,
              },
            }));
          },
        }),
      };
    });
  const tableScrollX = columns.reduce((sum, column) => sum + (typeof column.width === "number" ? column.width : 120), 0);
  const columnSettingContent = (
    <div style={{ width: 280 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>显示列</div>
      <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 12 }}>
        勾选需要展示的合同列表列。
      </div>
      <Checkbox.Group
        style={{ width: "100%" }}
        value={selectedToggleableColumnKeys}
        onChange={(value) => {
          const lockedKeys = CONTRACTS_TABLE_COLUMN_META.filter((item) => item.locked).map((item) => item.key);
          const visibleColumnKeys = Array.from(new Set([...lockedKeys, ...(value as ContractColumnKey[])]));
          setTablePreference((prev) => ({
            ...prev,
            visibleColumnKeys,
            columnWidths: normalizeTableWidths(CONTRACTS_TABLE_COLUMN_META, visibleColumnKeys, prev.columnWidths),
          }));
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {columnOptions.map((item) => (
            <label key={item.value} style={{ minHeight: 32, display: "flex", alignItems: "center" }}>
              <Checkbox value={item.value}>{item.label}</Checkbox>
            </label>
          ))}
        </div>
      </Checkbox.Group>
      <Divider style={{ margin: "12px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Button
          size="small"
          onClick={() => {
            setTablePreference((prev) => ({
              visibleColumnKeys: CONTRACTS_TABLE_COLUMN_META.map((item) => item.key),
              columnWidths: normalizeTableWidths(
                CONTRACTS_TABLE_COLUMN_META,
                CONTRACTS_TABLE_COLUMN_META.map((item) => item.key),
                prev.columnWidths,
              ),
            }));
          }}
        >
          显示全部
        </Button>
        <Button size="small" onClick={() => setTablePreference(getDefaultTablePreference(CONTRACTS_TABLE_COLUMN_META, true))}>
          恢复默认
        </Button>
      </div>
    </div>
  );

  const compactStatCardStyle = {
    borderRadius: 16,
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
  };
  const filterToolbarStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  };
  const filterGroupStyle = {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <Card style={compactStatCardStyle} bodyStyle={{ padding: 14 }}>
        <div style={filterToolbarStyle}>
        <div style={filterGroupStyle}>
          <Input
            allowClear
            style={{ width: 220 }}
            placeholder="搜索合同..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="全部状态"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: "draft", label: "草稿" },
              { value: "reviewing", label: "审核中" },
              { value: "signed", label: "已签约" },
              { value: "executing", label: "执行中" },
            ]}
          />
        </div>
        <Button
          type="primary"
          disabled={!canManageContracts}
          onClick={() => setIsModalVisible(true)}
        >
          + 生成合同
        </Button>
        </div>
      </Card>

      <Row gutter={[14, 14]}>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter(undefined);
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#1890ff" }}>
              📝
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>合同总数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setAmountModalVisible(true);
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#52c41a" }}>
              💰
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalAmountWan.toLocaleString("zh-CN")}万
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>总合同金额</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setSignedAmountModalVisible(true);
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#722ed1" }}>
              ✓
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {signedAmountWan.toLocaleString("zh-CN")}万
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              已签约合同金额
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter("executing");
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#fa8c16" }}>
              ⏳
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {executingCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>执行中</div>
          </Card>
        </Col>
      </Row>

      <div ref={listRef}>
      <Card
        style={compactStatCardStyle}
        bodyStyle={{ padding: 12 }}
        title="合同列表"
        extra={
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Popover trigger="click" placement="bottomRight" content={columnSettingContent}>
              <Button size="small">
                列设置（{selectedToggleableColumnKeys.length}/{columnOptions.length}）
              </Button>
            </Popover>
          </div>
        }
      >
        <Table<ContractItem>
          size="small"
          components={{ header: { cell: ResizableHeaderCell } }}
          scroll={{ x: tableScrollX }}
          pagination={{
            current: page,
            pageSize,
            total: filteredContracts.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          dataSource={paginatedContracts}
          rowKey="key"
          columns={columns}
        />
      </Card>
      </div>

      {/* 生成合同 */}
      <Modal
        title="生成合同"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => {
          setIsModalVisible(false);
          upsertContractOverride({
            key: `contract-manual-${Date.now()}`,
            name: "新生成合同",
            projectName: "未绑定项目",
            customer: "待补充客户",
            salesOwner:
              getSelectableOwnerOptions("sales")[0]?.label || "待分配销售负责人",
            preSalesOwner:
              getSelectableOwnerOptions("presales")[0]?.label || "待分配售前负责人",
            amount: "¥0万",
            paymentTerm: "待补充",
            signDate: new Date().toISOString().slice(0, 10),
            status: "draft",
            signatureStatus: "unsigned",
          });
          void message.success("模拟：合同生成成功");
        }}
        okText="生成合同"
        cancelText="取消"
        width={720}
      >
        <Paragraph style={{ marginBottom: 16 }}>
          这里演示通过前端表单收集基础合同信息，并调用后端生成合同文档或电子签署请求。
        </Paragraph>
        <Paragraph>
          <strong>合同名称：</strong>
          某银行数字化转型项目合同
        </Paragraph>
        <Paragraph>
          <strong>甲方（客户）：</strong>
          某某银行股份有限公司
        </Paragraph>
        <Paragraph>
          <strong>乙方（供应商）：</strong>
          某某科技有限公司
        </Paragraph>
        <Paragraph type="secondary" style={{ marginTop: 16 }}>
          当前为合同生成入口占位，后续可接入真实合同模板生成服务，将当前商机与方案版本信息填充到合同中。
        </Paragraph>
      </Modal>

      {/* 合同金额明细 */}
      <Modal
        title="合同金额明细"
        open={amountModalVisible}
        onCancel={() => setAmountModalVisible(false)}
        footer={
          <Button type="primary" onClick={() => setAmountModalVisible(false)}>
            关闭
          </Button>
        }
        width={720}
      >
        <Paragraph>
          当前合同总金额：
          <Text strong>
            {totalAmountWan.toLocaleString("zh-CN")}万
          </Text>
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          以下为按“合同列表”中每条合同的金额（单位“万”）累加得到的结果，后续可改为从后端统计接口获取。
        </Paragraph>
        <Table<ContractItem>
          size="small"
          pagination={false}
          rowKey="key"
          dataSource={contracts}
          columns={[
            {
              title: "合同名称",
              dataIndex: "name",
              key: "name",
            },
            {
              title: "客户",
              dataIndex: "customer",
              key: "customer",
            },
            {
              title: "合同金额",
              dataIndex: "amount",
              key: "amount",
            },
          ]}
        />
      </Modal>

      {/* 已签约合同金额明细 */}
      <Modal
        title="已签约合同金额明细"
        open={signedAmountModalVisible}
        onCancel={() => setSignedAmountModalVisible(false)}
        footer={
          <Button
            type="primary"
            onClick={() => setSignedAmountModalVisible(false)}
          >
            关闭
          </Button>
        }
        width={720}
      >
        <Paragraph>
          已签约合同金额合计：
          <Text strong>
            {signedAmountWan.toLocaleString("zh-CN")}万
          </Text>
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          该数值仅统计状态为“已签约”的合同金额（单位“万”），用于快速查看当前已签约项目的金额构成。
        </Paragraph>
        <Table<ContractItem>
          size="small"
          pagination={false}
          rowKey="key"
          dataSource={contracts.filter((c) => c.status === "signed")}
          columns={[
            {
              title: "合同名称",
              dataIndex: "name",
              key: "name",
            },
            {
              title: "客户",
              dataIndex: "customer",
              key: "customer",
            },
            {
              title: "合同金额",
              dataIndex: "amount",
              key: "amount",
            },
          ]}
        />
      </Modal>

      {/* 合同详情 */}
      <Modal
        title={viewContract ? `合同详情：${viewContract.name}` : "合同详情"}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewContract(null);
        }}
        footer={
          <Button
            type="primary"
            onClick={() => {
              setViewModalVisible(false);
              setViewContract(null);
            }}
          >
            关闭
          </Button>
        }
      >
        {viewContract && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <Text type="secondary">合同名称</Text>
              <div>{viewContract.name}</div>
            </div>
            <div>
              <Text type="secondary">关联项目</Text>
              <div>{viewContract.projectName}</div>
            </div>
            <div>
              <Text type="secondary">客户</Text>
              <div>{viewContract.customer}</div>
            </div>
            <div>
              <Text type="secondary">销售负责人</Text>
              <div>{viewContract.salesOwner}</div>
            </div>
            <div>
              <Text type="secondary">售前负责人</Text>
              <div>{viewContract.preSalesOwner}</div>
            </div>
            <div>
              <Text type="secondary">合同金额</Text>
              <div>{viewContract.amount}</div>
            </div>
            <div>
              <Text type="secondary">付款条件</Text>
              <div>{viewContract.paymentTerm}</div>
            </div>
            <div>
              <Text type="secondary">签约日期</Text>
              <div>{viewContract.signDate}</div>
            </div>
            <div>
              <Text type="secondary">状态</Text>
              <div>{getStatusTag(viewContract.status)}</div>
            </div>
            <div>
              <Text type="secondary">签名状态</Text>
              <div>{getSignatureTag(viewContract.signatureStatus)}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* 合同审批 */}
      <Modal
        title={approvalTarget ? `合同审批：${approvalTarget.name}` : "合同审批"}
        open={approvalModalVisible}
        onCancel={() => {
          setApprovalModalVisible(false);
          setApprovalTarget(null);
          setApprovalOpinion("");
        }}
        onOk={() => {
          if (!approvalTarget) return;
          // 简单示例：审批通过 -> 状态改为已签约 + 签名状态改为“签署中”
          upsertContractOverride({
            ...approvalTarget,
            status: "signed",
            signatureStatus:
              approvalTarget.signatureStatus === "signed" ? "signed" : "pending",
          });
          void message.success("已提交审批：通过");
          setApprovalModalVisible(false);
          setApprovalTarget(null);
          setApprovalOpinion("");
        }}
        okText="通过审批"
        cancelText="取消"
      >
        {approvalTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Paragraph type="secondary">
              当前审批流程用于演示合同从“审核中/草稿”到“已签约”的状态变更，
              后续可接入真实审批流与电子签名服务。
            </Paragraph>
            <div>
              <Text type="secondary">合同名称</Text>
              <div>{approvalTarget.name}</div>
            </div>
            <div>
              <Text type="secondary">当前状态</Text>
              <div>{getStatusTag(approvalTarget.status)}</div>
            </div>
            <div>
              <Text type="secondary">签名状态</Text>
              <div>{getSignatureTag(approvalTarget.signatureStatus)}</div>
            </div>
            <div>
              <Text type="secondary">审批意见</Text>
              <Input.TextArea
                rows={4}
                placeholder="请输入审批意见"
                style={{ marginTop: 4 }}
                value={approvalOpinion}
                onChange={(e) => setApprovalOpinion(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

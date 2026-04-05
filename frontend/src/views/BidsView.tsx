import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Select,
  Upload,
  message,
  Popover,
  Checkbox,
  Divider,
} from "antd";
import { useEffect, useRef, useState } from "react";
import {
  loadSharedDemoOpportunities,
  OPPORTUNITY_DEMO_UPDATED_EVENT,
  type DemoOpportunity,
  getSelectableOwnerOptions,
} from "../shared/opportunityDemoData";
import {
  deriveBidsFromOpportunities,
  mergeByKey,
  type BidItem,
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

const { Text } = Typography;

const BIDS_TABLE_STORAGE_KEY = "bidsTablePreference";
const BIDS_OVERRIDE_STORAGE_KEY = "bidsMockOverrides";
const BIDS_DELETED_KEYS_STORAGE_KEY = "bidsDeletedKeys";

const BIDS_TABLE_COLUMN_META = [
  { key: "index", title: "序号", defaultWidth: 72, minWidth: 72, visibleByDefault: true, locked: true, resizable: false },
  { key: "projectName", title: "投标项目", defaultWidth: 220, minWidth: 180, visibleByDefault: true, locked: true, resizable: true },
  { key: "linkedProject", title: "关联项目", defaultWidth: 220, minWidth: 180, visibleByDefault: true, locked: false, resizable: true },
  { key: "customer", title: "客户", defaultWidth: 180, minWidth: 140, visibleByDefault: true, locked: false, resizable: true },
  { key: "salesOwner", title: "销售负责人", defaultWidth: 160, minWidth: 130, visibleByDefault: true, locked: false, resizable: true },
  { key: "preSalesOwner", title: "售前负责人", defaultWidth: 160, minWidth: 130, visibleByDefault: true, locked: false, resizable: true },
  { key: "tenderNo", title: "招标编号", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "progress", title: "进度", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "openDate", title: "开标时间", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "amount", title: "投标金额", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "status", title: "状态", defaultWidth: 120, minWidth: 100, visibleByDefault: true, locked: false, resizable: true },
  { key: "action", title: "操作", defaultWidth: 200, minWidth: 200, visibleByDefault: true, locked: true, resizable: false },
] as const satisfies readonly TableColumnMeta<string>[];

type BidColumnKey = (typeof BIDS_TABLE_COLUMN_META)[number]["key"];

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

interface BidsViewProps {
  currentUser?: CurrentUser | null;
  initialKeyword?: string | null;
  onNavigateToProjects?: (projectName?: string) => void;
}

export function BidsView(props: BidsViewProps) {
  const { currentUser, initialKeyword, onNavigateToProjects } = props;
  const canManageBids = hasPermission(currentUser || null, "bidding.manage");
  const canDeleteBids = hasActionAccess(currentUser || null, "bidding.delete");

  const [sharedOpportunities, setSharedOpportunities] = useState<
    DemoOpportunity[]
  >(() => loadSharedDemoOpportunities());
  const [bidOverrides, setBidOverrides] = useState<BidItem[]>(
    () => loadStoredList<BidItem>(BIDS_OVERRIDE_STORAGE_KEY),
  );
  const [deletedBidKeys, setDeletedBidKeys] = useState<string[]>(
    () => loadStoredList<string>(BIDS_DELETED_KEYS_STORAGE_KEY),
  );
  const [keyword, setKeyword] = useState(initialKeyword?.trim() || "");
  const [createVisible, setCreateVisible] = useState(false);
  const [createDraft, setCreateDraft] = useState<{
    projectName?: string;
    customer?: string;
    tenderNo?: string;
    amount?: string;
    fileName?: string;
  }>({});
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewBid, setPreviewBid] = useState<BidItem | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const baseBids = deriveBidsFromOpportunities(sharedOpportunities);
  const baseBidKeys = new Set(baseBids.map((item) => item.key));
  const bids = mergeByKey(baseBids, bidOverrides).filter(
    (item) => !deletedBidKeys.includes(item.key),
  );
  const [statusFilter, setStatusFilter] = useState<
    BidItem["status"] | "finished" | undefined
  >(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tablePreference, setTablePreference] = useState<
    TablePreference<BidColumnKey>
  >(() =>
    loadTablePreference(BIDS_TABLE_STORAGE_KEY, BIDS_TABLE_COLUMN_META, true),
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

  const totalCount = bids.length;
  const ongoingCount = bids.filter((b) => b.status === "ongoing").length;
  const wonCount = bids.filter((b) => b.status === "won").length;
  const lostCount = bids.filter((b) => b.status === "lost").length;
  const bidRate =
    wonCount + lostCount > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : 0;

  const filteredBids = bids.filter((b) => {
    if (keyword.trim()) {
      const normalized = keyword.trim().toLowerCase();
      const searchable = [
        b.projectName,
        b.customer,
        b.salesOwner,
        b.preSalesOwner,
        b.tenderNo,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(normalized)) {
        return false;
      }
    }
    if (!statusFilter) return true;
    if (statusFilter === "finished") {
      // 中标率卡片：查看已结束的投标（中标 + 未中标）
      return b.status === "won" || b.status === "lost";
    }
    return b.status === statusFilter;
  });
  const paginatedBids = filteredBids.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredBids.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredBids.length, page, pageSize]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        BIDS_TABLE_STORAGE_KEY,
        JSON.stringify(tablePreference),
      );
    } catch {
      // ignore storage errors
    }
  }, [tablePreference]);

  useEffect(() => {
    saveStoredList(BIDS_OVERRIDE_STORAGE_KEY, bidOverrides);
  }, [bidOverrides]);

  useEffect(() => {
    saveStoredList(BIDS_DELETED_KEYS_STORAGE_KEY, deletedBidKeys);
  }, [deletedBidKeys]);

  const handleDeleteBid = (record: BidItem) => {
    if (!canDeleteBids) {
      message.warning("当前账号无权删除投标记录。");
      return;
    }
    Modal.confirm({
      title: `确认删除投标「${record.projectName}」？`,
      content: "删除后该投标记录将从当前列表移除，仅影响当前前端数据。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setBidOverrides((prev) => prev.filter((item) => item.key !== record.key));
        if (baseBidKeys.has(record.key)) {
          setDeletedBidKeys((prev) =>
            prev.includes(record.key) ? prev : [record.key, ...prev],
          );
        } else {
          setDeletedBidKeys((prev) => prev.filter((item) => item !== record.key));
        }
        message.success("已删除投标记录");
      },
    });
  };

  const allColumns = [
    {
      title: "序号",
      key: "index",
      width: 72,
      render: (_: unknown, __: BidItem, index: number) =>
        (page - 1) * pageSize + index + 1,
    },
    {
      title: "投标项目",
      dataIndex: "projectName",
      key: "projectName",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "关联项目",
      dataIndex: "projectName",
      key: "linkedProject",
      render: (text: string, record: BidItem) => (
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
    { title: "招标编号", dataIndex: "tenderNo", key: "tenderNo" },
    {
      title: "进度",
      dataIndex: "progress",
      key: "progress",
      render: (progress: string) => {
        let color: string = "default";
        if (progress === "标书制作") {
          color = "blue";
        } else if (progress === "已完成") {
          color = "green";
        }
        return <Tag color={color}>{progress}</Tag>;
      },
    },
    { title: "开标时间", dataIndex: "openDate", key: "openDate" },
    { title: "投标金额", dataIndex: "amount", key: "amount" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: BidItem["status"]) => {
        if (status === "ongoing") {
          return <Tag color="blue">进行中</Tag>;
        }
        if (status === "won") {
          return <Tag color="green">已中标</Tag>;
        }
        return <Tag color="red">未中标</Tag>;
      },
    },
    {
      title: "操作",
      key: "action",
      render: (_: unknown, record: BidItem) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setPreviewBid(record);
              setPreviewVisible(true);
            }}
          >
            预览
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              if (record.fileName) {
                message.success(`已开始下载标书文件：${record.fileName}`);
              } else {
                message.info("当前标书尚未上传文件");
              }
            }}
          >
            下载
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={!canDeleteBids}
            onClick={() => handleDeleteBid(record)}
          >
            删除
          </Button>
        </>
      ),
    },
  ];
  const selectedToggleableColumnKeys = getVisibleToggleableKeys(
    BIDS_TABLE_COLUMN_META,
    tablePreference.visibleColumnKeys,
  );
  const columnOptions = BIDS_TABLE_COLUMN_META.filter((item) => !item.locked).map(
    (item) => ({ value: item.key, label: item.title }),
  );
  const columns = allColumns
    .filter((column) =>
      tablePreference.visibleColumnKeys.includes(
        String(column.key || column.dataIndex || "") as BidColumnKey,
      ),
    )
    .map((column) => {
      const key = String(column.key || column.dataIndex || "") as BidColumnKey;
      const meta = BIDS_TABLE_COLUMN_META.find((item) => item.key === key);
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
  const tableScrollX = columns.reduce((sum, column) => {
    const width = typeof column.width === "number" ? column.width : 120;
    return sum + width;
  }, 0);
  const updateVisibleColumns = (nextKeys: BidColumnKey[]) => {
    const lockedKeys = BIDS_TABLE_COLUMN_META.filter((item) => item.locked).map(
      (item) => item.key,
    );
    const visibleColumnKeys = Array.from(new Set([...lockedKeys, ...nextKeys]));
    setTablePreference((prev) => ({
      ...prev,
      visibleColumnKeys,
      columnWidths: normalizeTableWidths(
        BIDS_TABLE_COLUMN_META,
        visibleColumnKeys,
        prev.columnWidths,
      ),
    }));
  };
  const columnSettingContent = (
    <div style={{ width: 280 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>显示列</div>
      <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 12 }}>
        勾选需要展示的投标列表列。
      </div>
      <Checkbox.Group
        style={{ width: "100%" }}
        value={selectedToggleableColumnKeys}
        onChange={(value) => updateVisibleColumns(value as BidColumnKey[])}
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
              visibleColumnKeys: BIDS_TABLE_COLUMN_META.map((item) => item.key),
              columnWidths: normalizeTableWidths(
                BIDS_TABLE_COLUMN_META,
                BIDS_TABLE_COLUMN_META.map((item) => item.key),
                prev.columnWidths,
              ),
            }));
          }}
        >
          显示全部
        </Button>
        <Button
          size="small"
          onClick={() =>
            setTablePreference(getDefaultTablePreference(BIDS_TABLE_COLUMN_META, true))
          }
        >
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
            placeholder="搜索投标项目 / 客户 / 负责人 / 招标编号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="全部状态"
            value={statusFilter}
            onChange={(value) =>
              setStatusFilter(
                value as BidItem["status"] | "finished" | undefined,
              )
            }
            options={[
              { value: "ongoing", label: "进行中" },
              { value: "won", label: "已中标" },
              { value: "lost", label: "未中标" },
              { value: "finished", label: "已结束" },
            ]}
          />
        </div>
        <Button
          type="primary"
          disabled={!canManageBids}
          onClick={() => {
            if (!canManageBids) {
              message.warning("当前账号无权新建标书。");
              return;
            }
            setCreateDraft({});
            setCreateVisible(true);
          }}
        >
          + 新建标书
        </Button>
        </div>
      </Card>

      <Row gutter={[14, 14]} style={{ marginTop: 0 }}>
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
              📄
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>投标总数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter("won");
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#52c41a" }}>
              🏆
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {wonCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>中标数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter("finished");
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#722ed1" }}>
              %
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {bidRate}%
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>中标率</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setStatusFilter("ongoing");
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
              {ongoingCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>进行中</div>
          </Card>
        </Col>
      </Row>

      <div ref={listRef}>
      <Card
        style={compactStatCardStyle}
        bodyStyle={{ padding: 12 }}
        title="投标项目列表"
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
        <Table<BidItem>
          size="small"
          components={{ header: { cell: ResizableHeaderCell } }}
          scroll={{ x: tableScrollX }}
          pagination={{
            current: page,
            pageSize,
            total: filteredBids.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          dataSource={paginatedBids}
          rowKey="key"
          columns={columns}
        />
      </Card>
      </div>

      {/* 新建标书（Mock） */}
      <Modal
        title="新建标书"
        open={createVisible}
        onCancel={() => {
          setCreateVisible(false);
          setCreateDraft({});
        }}
        onOk={() => {
          const projectName = (createDraft.projectName || "").trim();
          const customer = (createDraft.customer || "").trim();
          if (!projectName) {
            message.error("请输入投标项目名称");
            return;
          }
          if (!customer) {
            message.error("请输入客户名称");
            return;
          }
          const now = new Date();
          const createdAt = now.toISOString().slice(0, 10);
          const newBid: BidItem = {
            key: `bid-manual-${Date.now()}`,
            projectName,
            customer,
            salesOwner:
              getSelectableOwnerOptions("sales")[0]?.label || "待分配销售负责人",
            preSalesOwner:
              getSelectableOwnerOptions("presales")[0]?.label || "待分配售前负责人",
            tenderNo: createDraft.tenderNo || `MOCK-${Date.now()}`,
            progress: "标书制作",
            openDate: createdAt,
            amount: createDraft.amount || "待定",
            status: "ongoing",
            fileName: createDraft.fileName,
          };
          setBidOverrides((prev) => [newBid, ...prev]);
          message.success("已创建投标项目");
          setCreateDraft({});
          setCreateVisible(false);
        }}
        okText="保存标书"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Text>投标项目</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="例如：智慧园区一期项目"
              value={createDraft.projectName}
              onChange={(e) =>
                setCreateDraft((prev) => ({
                  ...prev,
                  projectName: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Text>客户名称</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="例如：某某地产集团"
              value={createDraft.customer}
              onChange={(e) =>
                setCreateDraft((prev) => ({
                  ...prev,
                  customer: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Text>招标编号</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="例如：ZN2024xxx"
              value={createDraft.tenderNo}
              onChange={(e) =>
                setCreateDraft((prev) => ({
                  ...prev,
                  tenderNo: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Text>投标金额</Text>
            <Input
              style={{ marginTop: 4 }}
              placeholder="例如：¥500万"
              value={createDraft.amount}
              onChange={(e) =>
                setCreateDraft((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <Text>上传标书文件</Text>
            <div style={{ marginTop: 4 }}>
              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  setCreateDraft((prev) => ({
                    ...prev,
                    fileName: file.name,
                  }));
                  message.success(`已选择标书文件：${file.name}`);
                  return false;
                }}
              >
                <Button size="small">选择文件</Button>
              </Upload>
              {createDraft.fileName && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#595959",
                  }}
                >
                  当前文件：{createDraft.fileName}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* 预览标书（简要信息） */}
      <Modal
        title={previewBid ? `标书预览：${previewBid.projectName}` : "标书预览"}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewBid(null);
        }}
        footer={
          <Button
            type="primary"
            onClick={() => {
              setPreviewVisible(false);
              setPreviewBid(null);
            }}
          >
            关闭
          </Button>
        }
      >
        {previewBid && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <Text type="secondary">投标项目</Text>
              <div>{previewBid.projectName}</div>
            </div>
            <div>
              <Text type="secondary">关联项目</Text>
              <div>{previewBid.projectName}</div>
            </div>
            <div>
              <Text type="secondary">客户</Text>
              <div>{previewBid.customer}</div>
            </div>
            <div>
              <Text type="secondary">销售负责人</Text>
              <div>{previewBid.salesOwner}</div>
            </div>
            <div>
              <Text type="secondary">售前负责人</Text>
              <div>{previewBid.preSalesOwner}</div>
            </div>
            <div>
              <Text type="secondary">招标编号</Text>
              <div>{previewBid.tenderNo}</div>
            </div>
            <div>
              <Text type="secondary">开标时间</Text>
              <div>{previewBid.openDate}</div>
            </div>
            <div>
              <Text type="secondary">投标金额</Text>
              <div>{previewBid.amount}</div>
            </div>
            <div>
              <Text type="secondary">标书文件</Text>
              <div>
                {previewBid.fileName || "尚未上传标书文件"}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

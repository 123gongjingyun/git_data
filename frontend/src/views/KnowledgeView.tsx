import {
  Card,
  Row,
  Col,
  Typography,
  Input,
  Select,
  Button,
  Tag,
  Table,
  Modal,
  Popover,
  Checkbox,
  Divider,
  message,
} from "antd";
import {
  useEffect,
  useState,
  useRef,
  type ChangeEvent,
} from "react";
import {
  loadSharedDemoOpportunities,
  OPPORTUNITY_DEMO_UPDATED_EVENT,
  type DemoOpportunity,
} from "../shared/opportunityDemoData";
import {
  deriveKnowledgeDocsFromOpportunities,
  mergeByKey,
  type KnowledgeDoc,
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
import { buildApiUrl } from "../shared/api";

const { Text, Paragraph } = Typography;

const KNOWLEDGE_TABLE_STORAGE_KEY = "knowledgeTablePreference";

const KNOWLEDGE_TABLE_COLUMN_META = [
  { key: "index", title: "序号", defaultWidth: 64, minWidth: 64, visibleByDefault: true, locked: true, resizable: false },
  { key: "primaryCategory", title: "一级知识库", defaultWidth: 160, minWidth: 130, visibleByDefault: true, locked: false, resizable: true },
  { key: "name", title: "文档名称", defaultWidth: 240, minWidth: 180, visibleByDefault: true, locked: true, resizable: true },
  { key: "category", title: "二级分类", defaultWidth: 160, minWidth: 130, visibleByDefault: true, locked: false, resizable: true },
  { key: "author", title: "作者", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "updatedAt", title: "更新时间", defaultWidth: 140, minWidth: 120, visibleByDefault: true, locked: false, resizable: true },
  { key: "size", title: "大小", defaultWidth: 100, minWidth: 90, visibleByDefault: true, locked: false, resizable: true },
  { key: "action", title: "操作", defaultWidth: 260, minWidth: 220, visibleByDefault: true, locked: true, resizable: false },
] as const satisfies readonly TableColumnMeta<string>[];

type KnowledgeColumnKey = (typeof KNOWLEDGE_TABLE_COLUMN_META)[number]["key"];

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  icon: string;
}

function suggestCategoryFromFiles(
  files: UploadedFile[],
): string | undefined {
  if (!files || files.length === 0) {
    return undefined;
  }
  const latest = files[files.length - 1];
  const name = latest.name.toLowerCase();

  if (name.includes("一指禅")) {
    return "销售知识库 / 销售一指禅";
  }
  if (name.includes("话术")) {
    return "销售知识库 / 销售话术";
  }

  if (name.includes("案例") || name.includes("成功") || name.includes("best practice")) {
    return "经验知识库 / 成功案例";
  }
  if (name.includes("方案") || name.includes("solution") || name.includes("解决方案")) {
    return "解决方案知识库 / 通用解决方案";
  }
  if (name.includes("模板") || name.includes("template") || name.includes("范本")) {
    return "经验知识库 / 文档模板";
  }
  if (name.includes("白皮书") || name.includes("行业") || name.includes("report")) {
    return "行业知识库 / 行业白皮书";
  }
  if (name.includes("产品") || name.includes("说明书") || name.includes("manual")) {
    return "产品知识库 / 产品操作手册";
  }
  if (name.includes("投标") || name.includes("招标")) {
    return "投标知识库 / 投标模板";
  }
  if (name.includes("实施") || name.includes("交付") || name.includes("运维")) {
    return "交付实施知识库 / 实施模板";
  }

  return undefined;
}

const initialKnowledgeDocs: KnowledgeDoc[] = [
  {
    key: "1",
    name: "某银行数字化转型案例",
    category: "经验知识库 / 成功案例",
    author: "张三",
    updatedAt: "2024-01-15",
    size: "2.5MB",
    isFavorite: true,
    isHot: true,
  },
  {
    key: "2",
    name: "MES系统解决方案模板",
    category: "解决方案知识库 / 通用解决方案",
    author: "李四",
    updatedAt: "2024-01-12",
    size: "1.8MB",
    isHot: true,
  },
  {
    key: "3",
    name: "技术方案撰写指南",
    category: "经验知识库 / 文档模板",
    author: "王五",
    updatedAt: "2024-01-10",
    size: "1.2MB",
  },
  {
    key: "4",
    name: "金融行业技术白皮书",
    category: "行业知识库 / 行业白皮书",
    author: "张三",
    updatedAt: "2024-01-08",
    size: "3.2MB",
    isHot: true,
  },
  {
    key: "5",
    name: "产品功能说明文档",
    category: "产品知识库 / 产品操作手册",
    author: "李四",
    updatedAt: "2024-01-05",
    size: "1.5MB",
  },
  {
    key: "6",
    name: "【示例】销售一指禅备忘速查表",
    category: "销售知识库 / 销售一指禅",
    author: "销售张三",
    updatedAt: "2024-01-16",
    size: "0.8MB",
    isFavorite: true,
  },
  {
    key: "7",
    name: "【示例】标准销售话术手册（通用版）",
    category: "销售知识库 / 销售话术",
    author: "销售李四",
    updatedAt: "2024-01-18",
    size: "1.0MB",
    isFavorite: true,
    isHot: true,
  },
  {
    key: "8",
    name: "【示例】通用售前解决方案模板",
    category: "解决方案知识库 / 通用解决方案",
    author: "方案负责人王五",
    updatedAt: "2024-01-20",
    size: "2.0MB",
  },
  {
    key: "9",
    name: "【示例】金融行业解决方案合集",
    category: "解决方案知识库 / 行业解决方案",
    author: "方案负责人赵六",
    updatedAt: "2024-01-21",
    size: "3.5MB",
  },
  {
    key: "10",
    name: "【示例】核心产品白皮书（v1.0）",
    category: "产品知识库 / 产品白皮书",
    author: "产品经理张三",
    updatedAt: "2024-01-22",
    size: "1.6MB",
  },
  {
    key: "11",
    name: "【示例】标准产品操作手册",
    category: "产品知识库 / 产品操作手册",
    author: "产品经理李四",
    updatedAt: "2024-01-22",
    size: "1.1MB",
  },
  {
    key: "12",
    name: "【示例】制造行业趋势与竞品分析报告",
    category: "行业知识库 / 行业白皮书",
    author: "行业顾问王五",
    updatedAt: "2024-01-23",
    size: "4.2MB",
  },
  {
    key: "13",
    name: "【示例】项目实施交付模板合集",
    category: "交付实施知识库 / 实施模板",
    author: "实施经理赵六",
    updatedAt: "2024-01-24",
    size: "2.8MB",
  },
  {
    key: "14",
    name: "【示例】运维与巡检手册（标准版）",
    category: "交付实施知识库 / 运维手册",
    author: "实施经理钱七",
    updatedAt: "2024-01-24",
    size: "1.9MB",
  },
  {
    key: "15",
    name: "【示例】投标文件模板（技术部分）",
    category: "投标知识库 / 投标模板",
    author: "投标负责人孙八",
    updatedAt: "2024-01-25",
    size: "1.3MB",
  },
];

interface KnowledgeCategoryTreeNode {
  id: string;
  name: string;
  icon: string;
  description: string;
  subCategories: { value: string; label: string }[];
}

const KNOWLEDGE_TREE_STORAGE_KEY = "knowledgeCategoryTreeConfig";

const KNOWLEDGE_CATEGORY_TREE: KnowledgeCategoryTreeNode[] = [
  {
    id: "experience",
    name: "经验知识库",
    icon: "📘",
    description:
      "沉淀成功案例与标准文档模板，作为售前与交付团队的经验复用入口。",
    subCategories: [
      {
        value: "经验知识库 / 成功案例",
        label: "成功案例",
      },
      {
        value: "经验知识库 / 文档模板",
        label: "文档模板",
      },
    ],
  },
  {
    id: "sales",
    name: "销售知识库",
    icon: "💼",
    description:
      "适用于销售团队的实战资料、话术脚本与一指禅速查表。",
    subCategories: [
      {
        value: "销售知识库 / 销售一指禅",
        label: "销售一指禅",
      },
      {
        value: "销售知识库 / 销售话术",
        label: "销售话术",
      },
    ],
  },
  {
    id: "solution",
    name: "解决方案知识库",
    icon: "🧩",
    description:
      "汇总通用方案、行业方案与典型场景方案，支撑售前快速选型与复用。",
    subCategories: [
      {
        value: "解决方案知识库 / 通用解决方案",
        label: "通用解决方案",
      },
      {
        value: "解决方案知识库 / 行业解决方案",
        label: "行业解决方案",
      },
      {
        value: "解决方案知识库 / 场景解决方案",
        label: "场景解决方案",
      },
    ],
  },
  {
    id: "product",
    name: "产品知识库",
    icon: "🧬",
    description:
      "产品白皮书、功能说明与操作手册统一收口，方便销售与售前查阅。",
    subCategories: [
      {
        value: "产品知识库 / 产品白皮书",
        label: "产品白皮书",
      },
      {
        value: "产品知识库 / 产品操作手册",
        label: "产品操作手册",
      },
    ],
  },
  {
    id: "industry",
    name: "行业知识库",
    icon: "🌐",
    description:
      "行业白皮书、政策解读与竞品分析，支撑行业洞察与标前策略制定。",
    subCategories: [
      {
        value: "行业知识库 / 行业白皮书",
        label: "行业白皮书",
      },
      {
        value: "行业知识库 / 政策解读",
        label: "政策解读",
      },
      {
        value: "行业知识库 / 竞品分析",
        label: "竞品分析",
      },
    ],
  },
  {
    id: "delivery",
    name: "交付实施知识库",
    icon: "🛠️",
    description:
      "项目实施模板、运维手册与巡检规范，保障交付与运维的一致性。",
    subCategories: [
      {
        value: "交付实施知识库 / 实施模板",
        label: "实施模板",
      },
      {
        value: "交付实施知识库 / 运维手册",
        label: "运维手册",
      },
    ],
  },
  {
    id: "bidding",
    name: "投标知识库",
    icon: "📄",
    description:
      "投标模板、评分标准解读等资源，提升投标命中率与规范性。",
    subCategories: [
      {
        value: "投标知识库 / 投标模板",
        label: "投标模板",
      },
      {
        value: "投标知识库 / 评分标准解读",
        label: "评分标准解读",
      },
    ],
  },
];

const baseCategoryOptions: { value: string; label: string }[] = [];

interface KnowledgeViewProps {
  currentUser?: CurrentUser | null;
}

export function KnowledgeView(props: KnowledgeViewProps = {}) {
  const { currentUser } = props;
  const canEditKnowledge = hasPermission(currentUser || null, "knowledge.edit");
  const canDeleteKnowledge = hasActionAccess(
    currentUser || null,
    "knowledge.delete",
  );
  const [sharedOpportunities, setSharedOpportunities] = useState<
    DemoOpportunity[]
  >(() => loadSharedDemoOpportunities());
  const [keyword, setKeyword] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(
    undefined,
  );
  const [primaryCategoryFilter, setPrimaryCategoryFilter] = useState<
    string | null
  >(null);
  const [categoryTree, setCategoryTree] = useState<KnowledgeCategoryTreeNode[]>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem(
            KNOWLEDGE_TREE_STORAGE_KEY,
          );
          if (stored) {
            const parsed = JSON.parse(stored) as KnowledgeCategoryTreeNode[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          }
        } catch {
          // ignore parse errors
        }
      }
      return KNOWLEDGE_CATEGORY_TREE;
    },
  );
  const [categoryTreeError, setCategoryTreeError] = useState<string | null>(
    null,
  );
  const [docOverrides, setDocOverrides] = useState<KnowledgeDoc[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<KnowledgeDoc[]>([]);
  const [removedDocKeys, setRemovedDocKeys] = useState<string[]>([]);
  const [cardFilter, setCardFilter] = useState<"all" | "favorite" | "hot">(
    "all",
  );
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [tablePreference, setTablePreference] = useState<
    TablePreference<KnowledgeColumnKey>
  >(() =>
    loadTablePreference(
      KNOWLEDGE_TABLE_STORAGE_KEY,
      KNOWLEDGE_TABLE_COLUMN_META,
      true,
    ),
  );
  const [classificationModalVisible, setClassificationModalVisible] =
    useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    {
      id: "1",
      name: "某银行数字化转型方案.pdf",
      size: "2.5 MB",
      icon: "📄",
    },
    {
      id: "2",
      name: "项目报价表.xlsx",
      size: "1.2 MB",
      icon: "📊",
    },
  ]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string | undefined>(
    undefined,
  );
  const suggestedCategory = suggestCategoryFromFiles(uploadedFiles);
  const docs = mergeByKey(
    [...initialKnowledgeDocs, ...deriveKnowledgeDocsFromOpportunities(sharedOpportunities)],
    [...uploadedDocs, ...docOverrides],
  ).filter((doc) => !removedDocKeys.includes(doc.key));

  const upsertDocOverride = (nextDoc: KnowledgeDoc) => {
    setDocOverrides((prev) => {
      const exists = prev.some((doc) => doc.key === nextDoc.key);
      return exists
        ? prev.map((doc) => (doc.key === nextDoc.key ? nextDoc : doc))
        : [nextDoc, ...prev];
    });
  };

  const handleUploadAreaClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || Number.isNaN(bytes)) return "";
    const mb = bytes / (1024 * 1024);
    if (mb < 0.1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const newFile: UploadedFile = {
      id: String(Date.now()),
      name: file.name,
      size: formatFileSize(file.size),
      icon: "📄",
    };
    setUploadedFiles((prev) => [...prev, newFile]);
    message.success(`文件 "${file.name}" 上传成功。`);
    // 重置 input 的值，避免选择同一个文件时不触发 change
    // eslint-disable-next-line no-param-reassign
    event.target.value = "";
  };

  const handleRemoveFile = (id: string) => {
    const target = uploadedFiles.find((file) => file.id === id);
    Modal.confirm({
      title: `确认删除待上传文件「${target?.name || "未命名文件"}」？`,
      content: "删除后该文件将从当前上传队列中移除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
        message.success("已删除待上传文件");
      },
    });
  };

  const handleDeleteDoc = (record: KnowledgeDoc) => {
    Modal.confirm({
      title: `确认删除文档「${record.name}」？`,
      content: "删除后该文档将从当前知识库列表中移除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setUploadedDocs((prev) => prev.filter((doc) => doc.key !== record.key));
        setDocOverrides((prev) => prev.filter((doc) => doc.key !== record.key));
        setRemovedDocKeys((prev) =>
          prev.includes(record.key) ? prev : [...prev, record.key],
        );
        message.success("已删除文档");
      },
    });
  };

  const handleConfirmUpload = () => {
    if (uploadedFiles.length === 0) {
      message.warning("当前没有待上传的文件");
      return;
    }

    if (!uploadCategory) {
      message.warning("请选择一个文档分类");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const appended: KnowledgeDoc[] = uploadedFiles.map((file) => ({
      key: `knowledge-upload-${file.id}`,
      name: file.name,
      category: uploadCategory,
      author: "当前用户",
      updatedAt: today,
      size: file.size,
    }));
    setUploadedDocs((prev) => [...appended, ...prev]);

    setUploadModalVisible(false);
    setUploadedFiles([]);
    setUploadCategory(undefined);
    message.success("上传成功，并按所选分类归类");
  };

  const filteredDocs = docs.filter((doc) => {
    if (primaryCategoryFilter) {
      const raw = doc.category || "";
      const parts = raw.split("/");
      const primary = (parts[0]?.trim() || raw || "未分类");
      if (primary !== primaryCategoryFilter) {
        return false;
      }
    }
    if (categoryFilter && categoryFilter.length > 0) {
      if (doc.category !== categoryFilter) {
        return false;
      }
    }
    if (cardFilter === "favorite" && !doc.isFavorite) {
      return false;
    }
    if (cardFilter === "hot" && !doc.isHot) {
      return false;
    }
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().toLowerCase();
      const name = doc.name.toLowerCase();
      const author = doc.author.toLowerCase();
      if (!name.includes(k) && !author.includes(k)) {
        return false;
      }
    }
    return true;
  });

  const paginatedDocs = filteredDocs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const allColumns = [
    {
      title: "序号",
      key: "index",
      width: 64,
      render: (_: unknown, __: KnowledgeDoc, index: number) =>
        (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: "一级知识库",
      dataIndex: "category",
      key: "primaryCategory",
      render: (category: string) => {
        if (!category) {
          return <Text type="secondary">未分类</Text>;
        }
        const parts = category.split("/");
        const primary = parts[0]?.trim();
        return <Text>{primary || category}</Text>;
      },
    },
    {
      title: "文档名称",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "二级分类",
      dataIndex: "category",
      key: "category",
      render: (category: string) => {
        if (!category) {
          return <Tag>未分类</Tag>;
        }
        const parts = category.split("/");
        const secondary = parts[1]?.trim();
        if (!secondary) {
          return <Tag>{category}</Tag>;
        }
        return <Tag>{secondary}</Tag>;
      },
    },
    { title: "作者", dataIndex: "author", key: "author" },
    { title: "更新时间", dataIndex: "updatedAt", key: "updatedAt" },
    { title: "大小", dataIndex: "size", key: "size" },
    {
      title: "操作",
      key: "action",
      render: (_: unknown, record: KnowledgeDoc) => (
        <>
          <Button type="link" size="small" onClick={() => { message.info(`预览文档：${record.name}`); }}>
            预览
          </Button>
          <Button type="link" size="small" onClick={() => { message.success(`已开始下载文档：${record.name}`); }}>
            下载
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              upsertDocOverride({
                ...record,
                isFavorite: !record.isFavorite,
              });
            }}
          >
            {record.isFavorite ? "★ 收藏" : "☆ 收藏"}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              upsertDocOverride({
                ...record,
                isHot: !record.isHot,
              });
            }}
          >
            {record.isHot ? "🔥 热门" : "🔥 设为热门"}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={!canDeleteKnowledge}
            onClick={() => {
              handleDeleteDoc(record);
            }}
          >
            删除
          </Button>
        </>
      ),
    },
  ];
  const selectedToggleableColumnKeys = getVisibleToggleableKeys(
    KNOWLEDGE_TABLE_COLUMN_META,
    tablePreference.visibleColumnKeys,
  );
  const columnOptions = KNOWLEDGE_TABLE_COLUMN_META.filter((item) => !item.locked).map(
    (item) => ({ value: item.key, label: item.title }),
  );
  const columns = allColumns
    .filter((column) =>
      tablePreference.visibleColumnKeys.includes(
        String(column.key || column.dataIndex || "") as KnowledgeColumnKey,
      ),
    )
    .map((column) => {
      const key = String(column.key || column.dataIndex || "") as KnowledgeColumnKey;
      const meta = KNOWLEDGE_TABLE_COLUMN_META.find((item) => item.key === key);
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
        勾选需要展示的文档列表列。
      </div>
      <Checkbox.Group
        style={{ width: "100%" }}
        value={selectedToggleableColumnKeys}
        onChange={(value) => {
          const lockedKeys = KNOWLEDGE_TABLE_COLUMN_META.filter((item) => item.locked).map((item) => item.key);
          const visibleColumnKeys = Array.from(new Set([...lockedKeys, ...(value as KnowledgeColumnKey[])]));
          setTablePreference((prev) => ({
            ...prev,
            visibleColumnKeys,
            columnWidths: normalizeTableWidths(KNOWLEDGE_TABLE_COLUMN_META, visibleColumnKeys, prev.columnWidths),
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
              visibleColumnKeys: KNOWLEDGE_TABLE_COLUMN_META.map((item) => item.key),
              columnWidths: normalizeTableWidths(
                KNOWLEDGE_TABLE_COLUMN_META,
                KNOWLEDGE_TABLE_COLUMN_META.map((item) => item.key),
                prev.columnWidths,
              ),
            }));
          }}
        >
          显示全部
        </Button>
        <Button size="small" onClick={() => setTablePreference(getDefaultTablePreference(KNOWLEDGE_TABLE_COLUMN_META, true))}>
          恢复默认
        </Button>
      </div>
    </div>
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        KNOWLEDGE_TABLE_STORAGE_KEY,
        JSON.stringify(tablePreference),
      );
    } catch {
      // ignore storage errors
    }
  }, [tablePreference]);

  const primaryCategoryStats = filteredDocs.reduce<Record<string, number>>(
    (acc, doc) => {
      const raw = doc.category || "";
      const parts = raw.split("/");
      const primary = (parts[0]?.trim() || raw || "未分类");
      acc[primary] = (acc[primary] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const primaryCategoryStatsEntries = Object.entries(primaryCategoryStats);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
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
    const loadCategoryTree = async () => {
      try {
        const resp = await fetch(
          buildApiUrl("/knowledge/categories/tree"),
        );
        if (!resp.ok) {
          // 后端未提供该接口或返回错误时，提示并继续使用前端内置/本地配置
          setCategoryTreeError(
            "当前未启用后端知识库目录配置，暂时使用内置分类，后续接入数据库与配置页面后可从后端加载。",
          );
          return;
        }
        const data = (await resp.json()) as KnowledgeCategoryTreeNode[];
        if (Array.isArray(data) && data.length > 0) {
          setCategoryTree(data);
          setCategoryTreeError(null);
        }
      } catch {
        // 在未接入后端或请求异常时，提示并继续使用前端默认配置
        setCategoryTreeError(
          "当前未启用后端知识库目录配置，暂时使用内置分类，后续接入数据库与配置页面后可从后端加载。",
        );
      }
    };

    void loadCategoryTree();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<KnowledgeCategoryTreeNode[]>;
      const data = custom.detail;
      if (Array.isArray(data) && data.length > 0) {
        setCategoryTree(data);
      }
    };
    window.addEventListener("knowledgeTreeUpdated", handler);
    return () => {
      window.removeEventListener("knowledgeTreeUpdated", handler);
    };
  }, []);

  const treeCategoryOptions =
    categoryTree.length > 0
      ? categoryTree.flatMap((node) => node.subCategories || [])
      : KNOWLEDGE_CATEGORY_TREE.flatMap((node) => node.subCategories || []);

  const allCategoryOptions = [...baseCategoryOptions, ...treeCategoryOptions];

  const totalDocsCount = docs.length;
  const favoriteCount = docs.filter((d) => d.isFavorite).length;
  const hotCount = docs.filter((d) => d.isHot).length;
  const compactStatCardStyle: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid var(--app-border)",
    boxShadow: "var(--app-shadow)",
  };
  const filterToolbarStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  };
  const filterGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  };
  const categoryStatsEntries = Object.entries(
    docs.reduce<Record<string, number>>((acc, doc) => {
      const key = doc.category && doc.category.trim().length > 0
        ? doc.category
        : "未分类";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Card style={compactStatCardStyle} bodyStyle={{ padding: 14 }}>
        <div style={filterToolbarStyle}>
          <div style={filterGroupStyle}>
          <Input
            allowClear
            style={{ width: 220 }}
            placeholder="搜索文档..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            style={{ width: 180 }}
            placeholder="全部分类"
            value={categoryFilter}
            onChange={(value) => setCategoryFilter(value)}
            options={allCategoryOptions}
          />
          </div>
          <Button
            type="primary"
            disabled={!canEditKnowledge}
            onClick={() => {
              if (!canEditKnowledge) {
                message.warning("当前账号无权上传文档。");
                return;
              }
              setUploadModalVisible(true);
            }}
          >
            + 上传文档
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
              setKeyword("");
              setCategoryFilter(undefined);
              setPrimaryCategoryFilter(null);
              setCardFilter("all");
              setCurrentPage(1);
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#1890ff" }}>
              📚
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalDocsCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>文档总数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setClassificationModalVisible(true);
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#52c41a" }}>
              📁
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {
                new Set(
                  docs
                    .map((d) => d.category)
                    .filter((c) => c && c.trim().length > 0),
                ).size
              }
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>分类数量</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setCategoryFilter(undefined);
              setPrimaryCategoryFilter(null);
              setKeyword("");
              setCardFilter("favorite");
              setCurrentPage(1);
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#722ed1" }}>
              ⭐
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {favoriteCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>我的收藏</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            size="small"
            hoverable
            style={compactStatCardStyle}
            bodyStyle={{ padding: "14px 16px" }}
            onClick={() => {
              setCategoryFilter(undefined);
              setPrimaryCategoryFilter(null);
              setKeyword("");
              setCardFilter("hot");
              setCurrentPage(1);
              if (listRef.current) {
                listRef.current.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6, color: "#fa8c16" }}>
              🔥
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {hotCount}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>热门文档</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[14, 14]}>
        <Col xs={24} md={7}>
          <Card
            title="文档分类"
            style={compactStatCardStyle}
            bodyStyle={{ padding: 14 }}
          >
            {categoryTreeError && (
              <div
                style={{
                  marginBottom: 8,
                  fontSize: 12,
                  color: "#fa8c16",
                }}
              >
                {categoryTreeError}
              </div>
            )}
            <div
              className="app-scrollbar"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 640,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {categoryTree.map((node) => {
                const isActiveGroup =
                  !!categoryFilter &&
                  categoryFilter.startsWith(`${node.name} /`);
                return (
                  <div
                    key={node.id}
                    style={{
                      padding: 10,
                      background: isActiveGroup
                        ? "color-mix(in srgb, rgba(59,130,246,0.16) 70%, var(--app-surface) 30%)"
                        : "var(--app-surface-soft)",
                      borderRadius: 12,
                      cursor: "pointer",
                      border: isActiveGroup
                        ? "1px solid rgba(59, 130, 246, 0.3)"
                        : "1px solid var(--app-border)",
                      borderLeft: isActiveGroup
                        ? "3px solid #1890ff"
                        : "3px solid var(--app-border)",
                    }}
                    onClick={() => setCategoryFilter(undefined)}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {node.icon} {node.name}（一级）
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--app-text-secondary)",
                        marginTop: 3,
                        lineHeight: 1.5,
                      }}
                    >
                      {node.description}
                    </div>
                    {node.subCategories.length > 0 && (
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {node.subCategories.map((sub) => (
                          <Tag
                            key={sub.value}
                            color={
                              categoryFilter === sub.value
                                ? "processing"
                                : "default"
                            }
                            style={{
                              cursor: "pointer",
                              marginRight: 0,
                              fontSize: 11,
                              lineHeight: "18px",
                              paddingInline: 8,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategoryFilter(sub.value);
                            }}
                          >
                            {sub.label}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={17}>
          <div ref={listRef}>
          <Card
            style={compactStatCardStyle}
            bodyStyle={{ padding: 14 }}
            title="文档列表"
            extra={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Popover trigger="click" placement="bottomRight" content={columnSettingContent}>
                  <Button size="small">
                    列设置（{selectedToggleableColumnKeys.length}/{columnOptions.length}）
                  </Button>
                </Popover>
              </div>
            }
          >
            <Table<KnowledgeDoc>
              size="small"
              components={{ header: { cell: ResizableHeaderCell } }}
              scroll={{ x: tableScrollX }}
              pagination={{
                current: currentPage,
                pageSize,
                total: filteredDocs.length,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 10);
                },
              }}
              dataSource={paginatedDocs}
              rowKey="key"
              columns={columns}
            />
          </Card>
          </div>
        </Col>
      </Row>

      {/* 文档上传模态框（复刻 demo.html 的展示效果） */}
      <Modal
        title="上传文档"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={560}
      >
        <input
          type="file"
          id="knowledge-document-upload"
          name="knowledgeDocumentUpload"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <div
          style={{
            border: "1px dashed #d9d9d9",
            borderRadius: 4,
            padding: 24,
            textAlign: "center",
            marginBottom: 16,
            background: "var(--app-surface-soft)",
            cursor: "pointer",
          }}
          onClick={handleUploadAreaClick}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
          <div
            style={{
              fontSize: 16,
              marginBottom: 4,
              color: "#262626",
            }}
          >
            点击或拖拽文件到此处上传
          </div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            支持 PDF、Word、Excel、PPT 等格式，单个文件不超过 50MB
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              display: "inline-block",
              marginBottom: 4,
              fontSize: 13,
              color: "#595959",
            }}
          >
            可选文档分类（示例）：
          </span>
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder="请选择上传文档的分类"
            value={uploadCategory}
            onChange={(value) => setUploadCategory(value)}
            options={allCategoryOptions}
          />
          {suggestedCategory && !uploadCategory && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#8c8c8c",
              }}
            >
              根据最近上传文件名，推荐分类：
              <Text
                type="secondary"
                style={{ fontWeight: 500, marginLeft: 4, marginRight: 4 }}
              >
                {suggestedCategory}
              </Text>
              （示例，仅供参考，仍需手动选择）
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderRadius: 4,
                border: "1px solid #f0f0f0",
                marginBottom: 8,
                background: "var(--app-surface-soft)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 20 }}>{file.icon}</div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      marginBottom: 4,
                    }}
                  >
                    {file.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#8c8c8c",
                    }}
                  >
                    {file.size}
                  </div>
                </div>
              </div>
              <Button
                type="link"
                size="small"
                danger
                disabled={!canDeleteKnowledge}
                onClick={() => handleRemoveFile(file.id)}
              >
                删除
              </Button>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 8,
          }}
        >
          <Button onClick={() => setUploadModalVisible(false)}>取消</Button>
          <Button type="primary" onClick={handleConfirmUpload}>
            确认上传
          </Button>
        </div>
      </Modal>

      {/* 分类数量明细（示例） */}
      <Modal
        title="分类数量明细（示例）"
        open={classificationModalVisible}
        onCancel={() => setClassificationModalVisible(false)}
        footer={
          <Button
            type="primary"
            onClick={() => setClassificationModalVisible(false)}
          >
            关闭
          </Button>
        }
        width={720}
      >
        <Paragraph>
          当前分类数量：
          <Text strong>
            {
              new Set(
                docs
                  .map((d) => d.category)
                  .filter((c) => c && c.trim().length > 0),
              ).size
            }
          </Text>
          {" "}
          个（按“一级 / 二级”组合去重计算）。
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          下表展示每个分类下的文档数量，分类格式形如“经验知识库 / 成功案例”；未设置分类的文档归为“未分类”。
        </Paragraph>
        <Table<[string, number]>
          size="small"
          pagination={false}
          rowKey={(row) => row[0]}
          dataSource={categoryStatsEntries}
          columns={[
            {
              title: "分类",
              dataIndex: 0,
              key: "category",
              render: (value: string) => value || "未分类",
            },
            {
              title: "文档数量",
              dataIndex: 1,
              key: "count",
            },
          ]}
        />
      </Modal>
    </div>
  );
}

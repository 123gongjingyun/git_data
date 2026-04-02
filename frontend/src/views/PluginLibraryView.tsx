import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Typography,
  Input,
  Select,
  Modal,
  Upload,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { InboxOutlined } from "@ant-design/icons";
import { useState } from "react";
import { defaultLogoConfig, type LogoConfig } from "../logoConfig";

const { Text, Paragraph, Title } = Typography;
const { Dragger } = Upload;

type AssetType = "icon" | "logo";

interface PluginAsset {
  key: string;
  name: string;
  type: AssetType;
  format: string;
  sizeText: string;
  tags: string[];
  usageKey: string;
}

const initialAssets: PluginAsset[] = [
  {
    key: "1",
    name: "平台主 Logo（默认）",
    type: "logo",
    format: "PNG",
    sizeText: "256 × 64",
    tags: ["品牌", "登录页"],
    usageKey: "app.logo.main",
  },
  {
    key: "2",
    name: "金融行业图标",
    type: "icon",
    format: "SVG",
    sizeText: "32 × 32",
    tags: ["行业", "金融"],
    usageKey: "icon.industry.finance",
  },
  {
    key: "3",
    name: "制造行业图标",
    type: "icon",
    format: "SVG",
    sizeText: "32 × 32",
    tags: ["行业", "制造"],
    usageKey: "icon.industry.manufacturing",
  },
  {
    key: "4",
    name: "电商行业图标",
    type: "icon",
    format: "SVG",
    sizeText: "32 × 32",
    tags: ["行业", "电商"],
    usageKey: "icon.industry.ecommerce",
  },
  {
    key: "5",
    name: "AI 智能助手 Logo",
    type: "logo",
    format: "SVG",
    sizeText: "40 × 40",
    tags: ["品牌", "AI", "平台左侧"],
    usageKey: defaultLogoConfig.usageKey,
  },
  {
    key: "6",
    name: "管理驾驶舱 Logo",
    type: "logo",
    format: "PNG",
    sizeText: "40 × 40",
    tags: ["品牌", "管理层"],
    usageKey: "app.logo.dashboard",
  },
];

interface PluginLibraryViewProps {
  currentLogo: LogoConfig;
  onChangeLogo: (config: LogoConfig) => void;
  readOnly?: boolean;
}

export function PluginLibraryView(props: PluginLibraryViewProps) {
  const { currentLogo, onChangeLogo, readOnly = false } = props;
  const [assets, setAssets] = useState<PluginAsset[]>(initialAssets);
  const [keyword, setKeyword] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<AssetType | undefined>(
    undefined,
  );
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadingType, setUploadingType] = useState<AssetType>("icon");
  const [uploadingName, setUploadingName] = useState<string>("");
  const [uploadingTags, setUploadingTags] = useState<string>("");

  const filteredAssets = assets.filter((asset) => {
    if (typeFilter && asset.type !== typeFilter) {
      return false;
    }
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().toLowerCase();
      const inName = asset.name.toLowerCase().includes(k);
      const inTags = asset.tags.some((t) => t.toLowerCase().includes(k));
      const inUsage = asset.usageKey.toLowerCase().includes(k);
      if (!inName && !inTags && !inUsage) {
        return false;
      }
    }
    return true;
  });

  const handleCopyUsageKey = async (usageKey: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(usageKey);
        message.success("已复制引用标识，可在页面中使用该图标");
      } else {
        message.info(`引用标识：${usageKey}`);
      }
    } catch {
      message.info(`引用标识：${usageKey}`);
    }
  };

  const handleSetAsPlatformLogo = (asset: PluginAsset) => {
    if (readOnly) {
      message.warning("当前账号无权维护图标/Logo插件库。");
      return;
    }
    if (asset.type !== "logo") {
      message.info("当前仅支持将 Logo 类型资产设为平台主 Logo");
      return;
    }
    const newLogo: LogoConfig = {
      usageKey: asset.usageKey,
      displayName: asset.name,
    };
    onChangeLogo(newLogo);
    message.success(`已将「${asset.name}」设为平台主 Logo`);
  };

  const columns: ColumnsType<PluginAsset> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (type: AssetType) =>
        type === "icon" ? (
          <Tag color="blue">图标</Tag>
        ) : (
          <Tag color="purple">Logo</Tag>
        ),
    },
    {
      title: "格式",
      dataIndex: "format",
      key: "format",
    },
    {
      title: "尺寸",
      dataIndex: "sizeText",
      key: "sizeText",
    },
    {
      title: "标签",
      dataIndex: "tags",
      key: "tags",
      render: (tags: string[]) => (
        <>
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </>
      ),
    },
    {
      title: "引用标识",
      dataIndex: "usageKey",
      key: "usageKey",
      render: (usageKey: string) => (
        <Button
          type="link"
          size="small"
          onClick={() => void handleCopyUsageKey(usageKey)}
        >
          {usageKey}
        </Button>
      ),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() =>
              message.info(`正在预览：${record.name}`)
            }
          >
            预览
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() =>
              message.success(`已开始下载：${record.name}`)
            }
          >
            下载
          </Button>
          {record.type === "logo" && (
            <Button
              type="link"
              size="small"
              disabled={readOnly}
              onClick={() => handleSetAsPlatformLogo(record)}
            >
              设为平台 Logo
            </Button>
          )}
        </>
      ),
    },
  ];

  const handleConfirmUpload = () => {
    if (readOnly) {
      message.warning("当前账号无权维护图标/Logo插件库。");
      return;
    }
    if (!uploadingName.trim()) {
      message.warning("请填写名称");
      return;
    }
    const tags =
      uploadingTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) || [];
    const newAsset: PluginAsset = {
      key: `${Date.now()}`,
      name: uploadingName.trim(),
      type: uploadingType,
      format: "SVG / PNG",
      sizeText: "自适应",
      tags,
      usageKey: `custom.${uploadingType}.${Date.now()}`,
    };
    setAssets((prev) => [newAsset, ...prev]);
    setUploadingName("");
    setUploadingTags("");
    setUploadingType("icon");
    setUploadVisible(false);
    message.success("已添加到插件库");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card>
            <Title level={4} style={{ marginBottom: 8 }}>
              插件库（图标 / Logo 资产中心）
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              用于集中存放平台使用的图标和 Logo 资源，未来项目管理、商机管理、
              知识库等页面中的图标都可以从这里统一挑选和引用，
              便于保持视觉一致性与品牌统一。
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <Paragraph style={{ marginBottom: 4 }}>
              <Text strong>使用说明：</Text>
            </Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
              在开发平台页面时，可以通过“引用标识”字段，在组件中引用对应图标 /
              Logo。后续可继续接入后端存储与真实文件上传。
            </Paragraph>
            <div
              style={{
                marginTop: 12,
                paddingTop: 8,
                borderTop: "1px dashed #f0f0f0",
                fontSize: 12,
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <Text strong>当前平台主 Logo：</Text>
              </div>
              <div>
                <Text>
                  {currentLogo.displayName}（引用标识：{currentLogo.usageKey}）
                </Text>
              </div>
              <Paragraph
                type="secondary"
                style={{ marginTop: 4, marginBottom: 0 }}
              >
                在正式接入后端后，可由插件库将该配置同步到全局设置中，用于驱动左侧导航栏中的 Logo 展示。
              </Paragraph>
            </div>
          </Card>
        </Col>
      </Row>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Input
            allowClear
            placeholder="搜索名称 / 标签 / 引用标识..."
            style={{ width: 260, maxWidth: "100%" }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            allowClear
            placeholder="全部类型"
            style={{ width: 140 }}
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as AssetType | undefined)}
            options={[
              { value: "icon", label: "图标" },
              { value: "logo", label: "Logo" },
            ]}
          />
        </div>
        <Button
          type="primary"
          disabled={readOnly}
          onClick={() => setUploadVisible(true)}
        >
          + 上传图标 / Logo
        </Button>
      </div>

      <Card title="图标 / Logo 列表" size="small">
        <Table<PluginAsset>
          size="small"
          rowKey="key"
          pagination={false}
          scroll={{ x: 1080 }}
          dataSource={filteredAssets}
          columns={columns}
        />
      </Card>

      <Modal
        title="上传图标 / Logo"
        open={uploadVisible}
        onCancel={() => setUploadVisible(false)}
        onOk={handleConfirmUpload}
        okText="添加到插件库"
        cancelText="取消"
        destroyOnClose
      >
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          当前先演示上传与管理流程，后续可继续接入真实文件存储。
        </Paragraph>
        <Dragger
          multiple={false}
          beforeUpload={() => false}
          style={{ marginBottom: 16 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域</p>
          <p className="ant-upload-hint">支持 SVG / PNG / JPG 等常见格式。</p>
        </Dragger>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Input
              placeholder="名称，如：登录页 Logo"
              style={{ flex: 1, minWidth: 220 }}
              value={uploadingName}
              onChange={(e) => setUploadingName(e.target.value)}
            />
            <Select
              style={{ width: 140 }}
              value={uploadingType}
              onChange={(value) => setUploadingType(value as AssetType)}
              options={[
                { value: "icon", label: "图标" },
                { value: "logo", label: "Logo" },
              ]}
            />
          </div>
          <Input
            placeholder="标签（可选，多标签用逗号分隔，如：品牌, 登录页）"
            value={uploadingTags}
            onChange={(e) => setUploadingTags(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

import { Alert, Button, Card, Col, Row, Segmented, Select, Table, Tag, Typography } from "antd";
import type {
  FeishuCardActionPreview,
  FeishuCardActionType,
  FeishuCardPreview,
} from "../../shared/feishuIntegrationMock";

const { Text } = Typography;

interface FeishuCardsPreviewPanelProps {
  cards: FeishuCardPreview[];
  selectedCard: FeishuCardPreview | null | undefined;
  selectedAction: FeishuCardPreview["actions"][number] | undefined;
  selectedCardId: string;
  onSelectedCardIdChange: (value: string) => void;
  onRefreshCardPreview: () => Promise<void>;
  cardFieldMappings: Array<{
    uiField: string;
    contractField: string;
    note: string;
  }>;
  selectedActionKey: string;
  onSelectedActionKeyChange: (value: string) => void;
  actionPayloadRows: Array<{
    key: string;
    label: string;
    type: string;
    enabled: string;
    action: string;
  }>;
  selectedActionPayload: string;
}

export function FeishuCardsPreviewPanel(props: FeishuCardsPreviewPanelProps) {
  const {
    cards,
    selectedCard,
    selectedAction,
    selectedCardId,
    onSelectedCardIdChange,
    onRefreshCardPreview,
    cardFieldMappings,
    selectedActionKey,
    onSelectedActionKeyChange,
    actionPayloadRows,
    selectedActionPayload,
  } = props;

  if (!selectedCard) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Segmented
        block
        value={selectedCardId}
        onChange={(value) => onSelectedCardIdChange(String(value))}
        options={cards.map((item) => ({
          label: item.title,
          value: item.id,
        }))}
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button size="small" onClick={() => void onRefreshCardPreview()}>
          从后端刷新当前示例
        </Button>
      </div>

      <Card
        size="small"
        style={{
          borderRadius: 18,
          background:
            "linear-gradient(180deg, color-mix(in srgb, rgba(20,184,166,0.12) 68%, var(--app-surface) 32%) 0%, color-mix(in srgb, var(--app-surface-soft) 96%, transparent) 100%)",
          border:
            "1px solid color-mix(in srgb, var(--app-accent) 18%, var(--app-border) 82%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {selectedCard.title}
              </div>
              <Text type="secondary">{selectedCard.subtitle}</Text>
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
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
                <Card
                  size="small"
                  bordered={false}
                  style={{ background: "var(--app-surface-soft)" }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {field.label}
                  </Text>
                  <div style={{ marginTop: 6, fontWeight: 600 }}>
                    {field.value}
                  </div>
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
                  background:
                    "color-mix(in srgb, var(--app-surface) 86%, var(--app-surface-soft) 14%)",
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
            value={selectedAction?.key || selectedActionKey}
            onChange={(value) => onSelectedActionKeyChange(String(value))}
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
  );
}

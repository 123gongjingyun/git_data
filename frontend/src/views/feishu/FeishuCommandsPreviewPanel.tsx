import { Alert, Button, Card, Col, Empty, Row, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  FeishuCommandPreview,
} from "../../shared/feishuIntegrationMock";

const { Text } = Typography;

type CommandExecutionStatus = "idle" | "success" | "error" | "empty";
type CommandExecutionState = {
  title: string;
  subtitle?: string;
  summaryLines: string[];
  fields: Array<{ label: string; value: string }>;
};
type CommandRequestInfo = {
  command: string;
  endpoint: string;
  requestedAt: string;
  source: string;
  result: "success" | "error" | "empty";
  durationMs?: number;
};

interface FeishuCommandsPreviewPanelProps {
  commands: FeishuCommandPreview[];
  commandColumns: ColumnsType<FeishuCommandPreview>;
  onRunCommandPreview: (command: FeishuCommandPreview) => Promise<void>;
  commandExecutionStatus: CommandExecutionStatus;
  commandExecutionMessage: string;
  recentCommandRequest: CommandRequestInfo | null;
  commandExecution: CommandExecutionState | null;
}

export function FeishuCommandsPreviewPanel(
  props: FeishuCommandsPreviewPanelProps,
) {
  const {
    commands,
    commandColumns,
    onRunCommandPreview,
    commandExecutionStatus,
    commandExecutionMessage,
    recentCommandRequest,
    commandExecution,
  } = props;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={commands}
        columns={[
          ...commandColumns,
          {
            title: "操作",
            key: "action",
            width: 120,
            render: (_, record) => (
              <Button size="small" onClick={() => void onRunCommandPreview(record)}>
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
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                {recentCommandRequest.command}
              </div>
            </Col>
            <Col xs={24} md={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                请求时间
              </Text>
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                {recentCommandRequest.requestedAt}
              </div>
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
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
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
        <Card
          size="small"
          title={commandExecution.title}
          extra={commandExecution.subtitle}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row gutter={[12, 12]}>
              {commandExecution.fields.map((field) => (
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
            {commandExecution.summaryLines.map((line) => (
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
        </Card>
      )}
    </div>
  );
}

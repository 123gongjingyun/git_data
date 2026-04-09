import { Card, Col, Empty, Row, Select, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  FeishuBindingRecord,
} from "../../shared/feishuIntegrationMock";

const { Text } = Typography;

type BindingSortKey =
  | "updatedAt_desc"
  | "updatedAt_asc"
  | "name_asc"
  | "department_asc";

interface BindingSummaryItem {
  label: string;
  value: string;
  note: string;
}

interface FeishuBindingsPreviewPanelProps {
  filteredBindings: FeishuBindingRecord[];
  bindingSummary: BindingSummaryItem[];
  bindingSortKey: BindingSortKey;
  onBindingSortKeyChange: (value: BindingSortKey) => void;
  pagedBindings: FeishuBindingRecord[];
  bindingColumns: ColumnsType<FeishuBindingRecord>;
  bindingPage: number;
  bindingPageSize: number;
  onBindingPaginationChange: (
    page: number,
    pageSize: number,
  ) => void;
}

export function FeishuBindingsPreviewPanel(
  props: FeishuBindingsPreviewPanelProps,
) {
  const {
    filteredBindings,
    bindingSummary,
    bindingSortKey,
    onBindingSortKeyChange,
    pagedBindings,
    bindingColumns,
    bindingPage,
    bindingPageSize,
    onBindingPaginationChange,
  } = props;

  if (filteredBindings.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="当前筛选条件下没有匹配的飞书绑定记录"
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Row gutter={[12, 12]}>
        {bindingSummary.map((item) => (
          <Col xs={12} md={6} key={item.label}>
            <Card
              size="small"
              bordered={false}
              style={{ background: "var(--app-surface-soft)" }}
            >
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Text type="secondary">
          当前排序：
          {bindingSortKey === "updatedAt_desc"
            ? "最近更新优先"
            : bindingSortKey === "updatedAt_asc"
              ? "最早更新优先"
              : bindingSortKey === "name_asc"
                ? "按飞书姓名"
                : "按部门"}
        </Text>
        <Select
          value={bindingSortKey}
          onChange={onBindingSortKeyChange}
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
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onChange: (page, pageSize) =>
            onBindingPaginationChange(page, pageSize),
        }}
      />
    </div>
  );
}

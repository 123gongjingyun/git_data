import { useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Button,
  Progress,
  Timeline,
  Modal,
  Table,
  message,
  Input,
  Select,
} from "antd";

const { Paragraph, Text } = Typography;

interface DemoOpportunity {
  key: string;
  name: string;
  customer: string;
  stage: string;
  value: string;
  winRate: number;
  weightedValue: string;
  owner: string;
  nextAction: string;
  nextActionDate: string;
}

const demoOpportunities: DemoOpportunity[] = [
  {
    key: "1",
    name: "某银行数字化转型项目",
    customer: "某国有大型银行",
    stage: "方案编制",
    value: "¥5,000,000",
    winRate: 65,
    weightedValue: "¥3,250,000",
    owner: "张三（售前）",
    nextAction: "内部方案评审",
    nextActionDate: "2024-01-20",
  },
  {
    key: "2",
    name: "某能源集团安全接入项目",
    customer: "某能源集团",
    stage: "需求调研",
    value: "¥3,200,000",
    winRate: 40,
    weightedValue: "¥1,280,000",
    owner: "李四（售前）",
    nextAction: "客户现场调研",
    nextActionDate: "2024-01-18",
  },
  {
    key: "3",
    name: "某制造企业工业互联网平台",
    customer: "某制造企业",
    stage: "投标准备",
    value: "¥8,000,000",
    winRate: 55,
    weightedValue: "¥4,400,000",
    owner: "王五（售前）",
    nextAction: "完成投标文件初稿",
    nextActionDate: "2024-01-22",
  },
];

const stageTagColor: Record<string, string> = {
  方案编制: "blue",
  需求调研: "orange",
  投标准备: "green",
};

export interface PreSalesDemoViewProps {
  currentUsername: string | null;
  mode?: "workbench" | "projects" | "solutions" | "opportunities";
}

export function PreSalesDemoView(props: PreSalesDemoViewProps) {
  const { currentUsername, mode = "workbench" } = props;

  const [selectedOpportunity, setSelectedOpportunity] =
    useState<DemoOpportunity | null>(demoOpportunities[0]);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isSolutionApprovalVisible, setIsSolutionApprovalVisible] =
    useState(false);
  const [isContractModalVisible, setIsContractModalVisible] = useState(false);

  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState<string>("");

  const filteredOpportunities = demoOpportunities.filter((opp) => {
    if (stageFilter && stageFilter.length > 0 && opp.stage !== stageFilter) {
      return false;
    }
    if (keyword && keyword.trim().length > 0) {
      const k = keyword.trim().toLowerCase();
      const name = opp.name.toLowerCase();
      const customer = opp.customer.toLowerCase();
      const owner = opp.owner.toLowerCase();
      if (!name.includes(k) && !customer.includes(k) && !owner.includes(k)) {
        return false;
      }
    }
    return true;
  });

  const totalValueAmount = filteredOpportunities.reduce((sum, opp) => {
    if (opp.value.startsWith("¥")) {
      const numeric = Number(
        opp.value.replace("¥", "").replace(/,/g, ""),
      );
      return sum + (Number.isNaN(numeric) ? 0 : numeric);
    }
    return sum;
  }, 0);

  const totalWeightedValueAmount = filteredOpportunities.reduce(
    (sum, opp) => {
      if (opp.weightedValue.startsWith("¥")) {
        const numeric = Number(
          opp.weightedValue.replace("¥", "").replace(/,/g, ""),
        );
        return sum + (Number.isNaN(numeric) ? 0 : numeric);
      }
      return sum;
    },
    0,
  );

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString("zh-CN")}`;

  const totalValue = formatCurrency(totalValueAmount);
  const totalWeightedValue = formatCurrency(totalWeightedValueAmount);

  const buildTimelineItemsForOpportunity = (opp: DemoOpportunity | null) => {
    if (!opp) {
      return [];
    }

    const items: { color: string; children: React.ReactNode }[] = [];

    items.push({
      color: "gray",
      children: `线索创建 —— ${opp.customer} 初步提出需求`,
    });

    items.push({
      color: "blue",
      children: "需求澄清 —— 与客户完成首轮需求访谈与澄清",
    });

    if (opp.stage === "方案编制" || opp.stage === "投标准备") {
      items.push({
        color: "blue",
        children: "方案编制 —— 完成内部方案初稿与评审",
      });
    }

    if (opp.stage === "投标准备") {
      items.push({
        color: "orange",
        children: "投标准备 —— 根据招标文件完善技术与商务投标文档",
      });
      items.push({
        color: "gray",
        children: "投标截止（计划） —— 提交投标文件并等待评标结果",
      });
    }

    return items;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <Row gutter={16} style={{ marginTop: 8 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div className="stat-value" style={{ fontSize: 22, fontWeight: 600 }}>
              {filteredOpportunities.length}
            </div>
            <div className="stat-label" style={{ color: "#8c8c8c" }}>
              进行中的重点商机（当前筛选）
            </div>
            <div style={{ fontSize: 12, color: "#52c41a" }}>
              较上周 +1 个
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
            <div className="stat-value" style={{ fontSize: 22, fontWeight: 600 }}>
              {totalValue}
            </div>
            <div className="stat-label" style={{ color: "#8c8c8c" }}>
              商机总金额（本季度）
            </div>
            <div style={{ fontSize: 12, color: "#52c41a" }}>
              加权金额 {totalWeightedValue}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <div className="stat-value" style={{ fontSize: 22, fontWeight: 600 }}>
              3
            </div>
            <div className="stat-label" style={{ color: "#8c8c8c" }}>
              待处理方案评审
            </div>
            <div style={{ fontSize: 12, color: "#fa8c16" }}>
              其中 1 个超过 3 天未处理
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏰</div>
            <div className="stat-value" style={{ fontSize: 22, fontWeight: 600 }}>
              4
            </div>
            <div className="stat-label" style={{ color: "#8c8c8c" }}>
              7 日内关键截止事项
            </div>
            <div style={{ fontSize: 12, color: "#ff4d4f" }}>
              请优先关注投标截止与方案提报
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={mode === "workbench" ? 14 : 24}>
          <Card
            title={
              mode === "projects"
                ? "项目列表（示例）"
                : mode === "solutions"
                  ? "方案版本列表（示例）"
                  : "近期重点商机"
            }
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => setIsDetailModalVisible(true)}
              >
                查看当前商机详情
              </Button>
            }
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Input
                allowClear
                size="small"
                placeholder="按名称 / 客户 / 负责人搜索"
                style={{ width: 260 }}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Select
                allowClear
                size="small"
                placeholder="全部阶段"
                style={{ width: 200 }}
                value={stageFilter}
                onChange={(value) => setStageFilter(value)}
                options={[
                  { value: "方案编制", label: "方案编制" },
                  { value: "需求调研", label: "需求调研" },
                  { value: "投标准备", label: "投标准备" },
                ]}
              />
            </div>
            <Table
              size="small"
              pagination={false}
              dataSource={filteredOpportunities}
              rowKey="key"
              onRow={(record) => ({
                onClick: () => setSelectedOpportunity(record),
              })}
              columns={
                mode === "projects"
                  ? [
                      {
                        title: "项目名称",
                        dataIndex: "name",
                        key: "name",
                        render: (text: string) => <Text strong>{text}</Text>,
                      },
                      {
                        title: "客户",
                        dataIndex: "customer",
                        key: "customer",
                      },
                      {
                        title: "项目状态",
                        key: "status",
                        render: () => <Tag color="processing">进行中</Tag>,
                      },
                      {
                        title: "阶段",
                        dataIndex: "stage",
                        key: "stage",
                        render: (stage: string) => (
                          <Tag color={stageTagColor[stage] || "default"}>
                            {stage}
                          </Tag>
                        ),
                      },
                      {
                        title: "项目金额",
                        dataIndex: "value",
                        key: "value",
                      },
                      {
                        title: "负责人",
                        dataIndex: "owner",
                        key: "owner",
                      },
                    ]
                  : mode === "solutions"
                    ? [
                        {
                          title: "方案名称（示例）",
                          key: "solutionName",
                          render: (_, record) => (
                            <Text strong>
                              {record.name} 解决方案 v2.1
                            </Text>
                          ),
                        },
                        {
                          title: "所属项目",
                          dataIndex: "name",
                          key: "projectName",
                        },
                        {
                          title: "客户",
                          dataIndex: "customer",
                          key: "customer",
                        },
                        {
                          title: "方案状态",
                          key: "solutionStatus",
                          render: () => (
                            <Tag color="processing">评审中（示例）</Tag>
                          ),
                        },
                        {
                          title: "负责人",
                          dataIndex: "owner",
                          key: "owner",
                        },
                      ]
                    : [
                        {
                          title: "商机名称",
                          dataIndex: "name",
                          key: "name",
                          render: (text: string) => <Text strong>{text}</Text>,
                        },
                        {
                          title: "客户",
                          dataIndex: "customer",
                          key: "customer",
                        },
                        {
                          title: "阶段",
                          dataIndex: "stage",
                          key: "stage",
                          render: (stage: string) => (
                            <Tag color={stageTagColor[stage] || "default"}>
                              {stage}
                            </Tag>
                          ),
                        },
                        {
                          title: "金额 / 加权金额",
                          key: "value",
                          render: (_, record) => (
                            <span>
                              {record.value} /{" "}
                              <span style={{ color: "#8c8c8c" }}>
                                {record.weightedValue}
                              </span>
                            </span>
                          ),
                        },
                        {
                          title: "成功率",
                          dataIndex: "winRate",
                          key: "winRate",
                          render: (rate: number) => (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div className="progress-bar" style={{ width: 80 }}>
                                <Progress
                                  percent={rate}
                                  size="small"
                                  showInfo={false}
                                  status={rate >= 60 ? "success" : "active"}
                                />
                              </div>
                              <span style={{ fontSize: 12 }}>{rate}%</span>
                            </div>
                          ),
                        },
                        {
                          title: "负责人 / 下一步动作",
                          key: "owner",
                          render: (_, record) => (
                            <div style={{ fontSize: 12 }}>
                              <div>{record.owner}</div>
                              <div style={{ color: "#8c8c8c" }}>
                                {record.nextAction}（{record.nextActionDate}）
                              </div>
                            </div>
                          ),
                        },
                      ]
              }
            />
          </Card>
        </Col>
        {mode === "workbench" && (
          <Col xs={24} md={10}>
            <Card title="今日待办（示例）" style={{ marginBottom: 16 }}>
              <ul
                style={{ listStyle: "none", paddingLeft: 0, marginBottom: 0 }}
              >
                <li style={{ marginBottom: 8 }}>
                  <Tag color="orange" style={{ marginRight: 8 }}>
                    商机推进
                  </Tag>
                  跟进某银行数字化转型内部方案评审结果
                </li>
                <li style={{ marginBottom: 8 }}>
                  <Tag color="blue" style={{ marginRight: 8 }}>
                    文档
                  </Tag>
                  补充工业互联网平台项目投标技术方案章节
                </li>
                <li>
                  <Tag color="purple" style={{ marginRight: 8 }}>
                    会议
                  </Tag>
                  参加能源集团安全接入方案技术澄清会
                </li>
              </ul>
            </Card>
            <Card title="方案审批进度（示例）" style={{ marginBottom: 16 }}>
              <Timeline
                items={[
                  {
                    color: "green",
                    children: "某银行数字化转型方案 v2.1 技术评审通过",
                  },
                  {
                    color: "blue",
                    children: "某能源集团安全接入方案 商务评审进行中",
                  },
                  {
                    color: "gray",
                    children: "某制造企业工业互联网平台方案 等待最终审批",
                  },
                ]}
              />
            </Card>
            <Card title="快捷操作">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Button
                  type="primary"
                  onClick={() => setIsUploadModalVisible(true)}
                >
                  上传项目文档
                </Button>
                <Button onClick={() => setIsSolutionApprovalVisible(true)}>
                  查看方案审批流程
                </Button>
                <Button
                  danger
                  onClick={() => setIsContractModalVisible(true)}
                >
                  生成合同示例
                </Button>
              </div>
            </Card>
          </Col>
        )}
      </Row>

      {mode === "workbench" && (
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Card title="售前项目进展时间线（示例）" style={{ marginBottom: 16 }}>
              <Timeline
                items={buildTimelineItemsForOpportunity(selectedOpportunity)}
              />
              <Paragraph
                type="secondary"
                style={{ fontSize: 12, marginTop: 8 }}
              >
                时间线基于当前选中的 Demo 商机和阶段构造，
                后续可以与真实商机阶段变更记录打通，按时间顺序展示关键节点。
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={10}>
            <Card title="项目文档概览（示例）">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div>
                      <div>某银行数字化转型方案.pdf</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                        2.5 MB
                      </div>
                    </div>
                  </div>
                  <Button type="link" size="small">
                    预览
                  </Button>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 20 }}>📊</span>
                    <div>
                      <div>项目报价表.xlsx</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                        1.2 MB
                      </div>
                    </div>
                  </div>
                  <Button type="link" size="small">
                    下载
                  </Button>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 20 }}>📑</span>
                    <div>
                      <div>合同草稿.docx</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                        最近更新：2024-01-16
                      </div>
                    </div>
                  </div>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setIsContractModalVisible(true)}
                  >
                    打开
                  </Button>
                </div>
              </div>
              <Paragraph
                type="secondary"
                style={{ fontSize: 12, marginTop: 8 }}
              >
                文档信息目前为示例数据，后续可接入真实项目文档库（如对象存储或
                DMS），统一展示与当前商机相关的方案、报价与合同文件。
              </Paragraph>
            </Card>
          </Col>
        </Row>
      )}

      <Modal
        title="商机详情（示例）"
        open={isDetailModalVisible}
        footer={null}
        onCancel={() => setIsDetailModalVisible(false)}
        width={720}
      >
        {selectedOpportunity ? (
          <>
            <Paragraph style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>
              {selectedOpportunity.name}
            </Paragraph>
            <Paragraph>
              <strong>客户名称：</strong>
              {selectedOpportunity.customer}
            </Paragraph>
            <Paragraph>
              <strong>当前阶段：</strong>
              <Tag
                color={stageTagColor[selectedOpportunity.stage] || "default"}
              >
                {selectedOpportunity.stage}
              </Tag>
            </Paragraph>
            <Paragraph>
              <strong>负责人：</strong>
              {selectedOpportunity.owner}
            </Paragraph>
            <Paragraph>
              <strong>商机金额：</strong>
              {selectedOpportunity.value}（加权 {selectedOpportunity
                .weightedValue || "-"}
              ）
            </Paragraph>
            <Paragraph>
              <strong>成功概率：</strong>
              {selectedOpportunity.winRate}%
            </Paragraph>
            <Paragraph>
              <strong>下一步动作：</strong>
              {selectedOpportunity.nextAction}（
              {selectedOpportunity.nextActionDate}）
            </Paragraph>
            <Paragraph type="secondary">
              说明：详情内容为 demo 示例，用于展示后续可承载的“项目详情”信息布局，
              可与当前商机实体模型进行对齐后接入真实数据。
            </Paragraph>
          </>
        ) : (
          <Paragraph>当前暂无商机详情。</Paragraph>
        )}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <Button onClick={() => setIsDetailModalVisible(false)}>关闭</Button>
          <Button
            type="primary"
            onClick={() => {
              setIsDetailModalVisible(false);
              setIsSolutionApprovalVisible(true);
            }}
          >
            查看审批与下一阶段
          </Button>
        </div>
      </Modal>

      <Modal
        title="上传文档（示例）"
        open={isUploadModalVisible}
        onCancel={() => setIsUploadModalVisible(false)}
        onOk={() => {
          setIsUploadModalVisible(false);
          void message.success("模拟：文档上传成功");
        }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          这里将来可以接入真实的文件上传接口，目前为示例占位。
        </Paragraph>
        <div
          style={{
            border: "1px dashed #d9d9d9",
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
          <div>点击此处选择文件，或在真实接入时支持拖拽上传</div>
        </div>
      </Modal>

      <Modal
        title="方案审批流程（示例）"
        open={isSolutionApprovalVisible}
        onCancel={() => setIsSolutionApprovalVisible(false)}
        footer={null}
        width={720}
      >
        <Paragraph style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>
          某银行数字化转型方案 v2.1
        </Paragraph>
        <Paragraph style={{ marginBottom: 16 }}>
          以下为 demo 方案审批流程，展示技术评审、商务评审与最终审批三个阶段，
          后续可与 ReviewRecord 实体及审批流引擎打通。
        </Paragraph>
        <Timeline
          items={[
            {
              color: "green",
              children: "技术评审 —— 张三（已通过）",
            },
            {
              color: "blue",
              children: "商务评审 —— 李四（进行中）",
            },
            {
              color: "gray",
              children: "最终审批 —— 待开始",
            },
          ]}
        />
        <Paragraph style={{ marginTop: 16, marginBottom: 8 }}>
          <strong>添加审批意见（示例）：</strong>
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          在真实接入时，这里可以复用 useReviewRecords 中的
          createReviewRecord 接口，将审批意见提交到后端。
        </Paragraph>
      </Modal>

      <Modal
        title="生成合同（示例）"
        open={isContractModalVisible}
        onCancel={() => setIsContractModalVisible(false)}
        onOk={() => {
          setIsContractModalVisible(false);
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
          <strong>示例合同名称：</strong>
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
          当前为示例占位，后续可接入真实合同模板生成服务，将当前商机与方案版本信息填充到合同中。
        </Paragraph>
      </Modal>

      <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
        当前登录用户：{currentUsername || "示例售前工程师"}
      </Paragraph>
    </div>
  );
}

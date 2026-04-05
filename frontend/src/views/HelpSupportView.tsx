import { Card, Col, Divider, Row, Tag, Typography } from "antd";

const { Title, Paragraph, Text } = Typography;

const lifecycleSteps = [
  {
    key: "discovery",
    title: "阶段 1：商机发现",
    module: "商机管理",
    badgeColor: "orange",
    summary:
      "销售提供需求文档后，先完成机会录入、客户筛选和初步判断，确认是否属于目标客户及重点方向。",
    details: [
      "销售负责人补齐客户背景、需求说明和预期金额。",
      "销售管理者或负责人完成初筛，判断是否值得进入售前投入。",
      "售前经理确认后续承接人，并安排详细需求分析。",
    ],
    outputs: "需求说明、客户背景、机会判断结论",
  },
  {
    key: "solution_design",
    title: "阶段 2：方案设计",
    module: "解决方案",
    badgeColor: "blue",
    summary:
      "明确由哪位售前负责项目主线推进，围绕客户现状、边界、目标和约束形成方案初稿。",
    details: [
      "项目主线开始建立，进入统一协同视角。",
      "售前开展调研、访谈和需求拆解，沉淀调研结论。",
      "形成方案初稿、架构思路和关键风险识别。",
    ],
    outputs: "调研纪要、方案初稿、风险清单",
  },
  {
    key: "proposal",
    title: "阶段 3：方案提案",
    module: "解决方案",
    badgeColor: "cyan",
    summary:
      "在内部评审基础上形成面向客户的正式提案版本，统一管理方案版本、评审状态和提报材料。",
    details: [
      "内部完成技术和商务侧评审。",
      "输出正式提案、汇报材料和关键答疑口径。",
      "记录客户反馈，为后续投标或商务谈判做准备。",
    ],
    outputs: "正式提案、评审记录、客户反馈",
  },
  {
    key: "bidding",
    title: "阶段 4：投标阶段",
    module: "投标管理",
    badgeColor: "purple",
    summary:
      "当客户进入正式招投标流程后，统一在投标管理中跟踪标书准备、招标编号、开标时间和投标金额。",
    details: [
      "收口技术应答、实施内容和交付范围。",
      "维护招标编号、开标节点、投标金额和版本材料。",
      "跟踪投标状态，确保关键节点不遗漏。",
    ],
    outputs: "标书文件、投标计划、报价版本",
  },
  {
    key: "negotiation",
    title: "阶段 5：商务谈判",
    module: "投标管理",
    badgeColor: "geekblue",
    summary:
      "当项目进入价格、条款、范围确认阶段时，继续在投标管理中推进，直到形成最终商务结果。",
    details: [
      "围绕价格、商务条款、交付范围进行谈判。",
      "同步记录关键让步点和风险点。",
      "确认是否进入最终签约。",
    ],
    outputs: "商务条款确认、谈判纪要、签约条件",
  },
  {
    key: "won",
    title: "阶段 6：签约中标",
    module: "合同管理",
    badgeColor: "green",
    summary:
      "项目完成中标确认或正式签约后，统一进入合同管理，沉淀合同金额、付款条件、签约日期和执行状态。",
    details: [
      "确认合同主体、金额和付款方式。",
      "归档签约文件和合同版本。",
      "完成项目主线从售前到签约的闭环。",
    ],
    outputs: "合同文本、签约记录、执行状态",
  },
];

const quickStartSteps = [
  "先在商机管理中录入机会，补齐客户、需求、金额和负责人信息。",
  "确认机会进入持续推进后，建立项目主线，并将后续商机显式绑定到同一项目。",
  "方案设计与提案阶段统一在解决方案模块管理版本、评审和输出材料。",
  "进入招投标与谈判后，在投标管理中持续推进关键节点和商务状态。",
  "签约后转入合同管理，确保中标与合同信息留痕。",
  "项目过程资料优先留在对应业务模块中，经验模板与方法论再沉淀到知识库。",
];

const roleNotes = [
  {
    title: "项目管理看什么",
    content:
      "项目管理承载的是一个项目从商机发现、方案、投标、谈判到签约的完整主线，是跨模块协同的总视图。",
  },
  {
    title: "商机管理看什么",
    content:
      "商机管理聚焦销售机会本身。一个项目主线下可以挂多条商机，但这些商机必须显式归属于同一项目，不再按客户名称自动混合。",
  },
  {
    title: "知识库怎么用",
    content:
      "知识库更适合沉淀经验、销售、解决方案、产品、行业和交付实施等可复用知识资产；项目过程资料可同步归档，但不要求把所有业务文档都集中堆到知识库。",
  },
];

const sectionCardStyle = {
  borderRadius: 20,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface)",
  boxShadow: "var(--app-shadow)",
} as const;

const softCardStyle = {
  borderRadius: 16,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-soft)",
} as const;

export function HelpSupportView() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <Card
        style={{
          ...sectionCardStyle,
          borderRadius: 20,
          background:
            "linear-gradient(135deg, color-mix(in srgb, rgba(59,130,246,0.16) 68%, var(--app-surface) 32%) 0%, color-mix(in srgb, rgba(20,184,166,0.14) 68%, var(--app-surface) 32%) 100%)",
        }}
      >
        <Title level={3} style={{ marginBottom: 10, color: "var(--app-text)" }}>
          平台使用总览
        </Title>
        <Paragraph style={{ marginBottom: 12, color: "var(--app-text-secondary)" }}>
          本平台围绕“商机发现 → 方案设计 → 方案提案 → 投标阶段 → 商务谈判 → 签约中标”
          这一条售前主线展开。项目管理负责承载全生命周期主线，商机管理、解决方案、投标管理、
          合同管理则分别承载不同阶段的重点动作。
        </Paragraph>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tag color="orange">商机管理</Tag>
          <Tag color="blue">解决方案</Tag>
          <Tag color="purple">投标管理</Tag>
          <Tag color="green">合同管理</Tag>
          <Tag color="gold">项目管理贯穿全程</Tag>
          <Tag color="cyan">知识库贯穿全程</Tag>
        </div>
      </Card>

      <Card
        style={sectionCardStyle}
        title="生命周期分阶段说明"
        extra={<Text type="secondary">从机会发现到签约闭环</Text>}
      >
        <Row gutter={[16, 16]}>
          {lifecycleSteps.map((item, index) => (
            <Col xs={24} lg={12} key={item.key}>
              <Card
                size="small"
                style={{ ...softCardStyle, height: "100%" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <Title level={5} style={{ marginBottom: 4, color: "var(--app-text)" }}>
                      {index + 1}. {item.title}
                    </Title>
                    <Text type="secondary">{item.summary}</Text>
                  </div>
                  <Tag color={item.badgeColor}>{item.module}</Tag>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {item.details.map((detail) => (
                    <div key={detail} style={{ color: "var(--app-text)", fontSize: 13 }}>
                      • {detail}
                    </div>
                  ))}
                </div>
                <Divider style={{ margin: "14px 0 10px" }} />
                <Text strong style={{ color: "var(--app-text)" }}>关键产出：</Text>
                <Text style={{ color: "var(--app-text-secondary)" }}> {item.outputs}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="项目与商机的关系" style={sectionCardStyle}>
            {roleNotes.map((item) => (
              <div key={item.title} style={{ marginBottom: 16 }}>
                <Text strong style={{ color: "var(--app-text)" }}>{item.title}</Text>
                <Paragraph style={{ marginBottom: 0, marginTop: 6, color: "var(--app-text-secondary)" }}>
                  {item.content}
                </Paragraph>
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="资料沉淀建议" style={sectionCardStyle}>
            <Paragraph style={{ color: "var(--app-text-secondary)" }}>
              项目过程资料建议优先保存在对应业务模块中，便于围绕阶段推进直接查看；知识库则更偏向沉淀跨项目复用的通用资产：
            </Paragraph>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "var(--app-text)" }}>
              <div>• 商机管理：需求说明、客户背景、初筛结论、审批过程材料</div>
              <div>• 解决方案：调研纪要、方案初稿、正式提案、评审意见</div>
              <div>• 投标管理：标书文件、报价版本、商务条款、谈判纪要</div>
              <div>• 合同管理：合同文本、签约记录、执行状态材料</div>
              <div>• 知识库：销售方法、行业案例、产品资料、解决方案模板、实施与交付经验</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="快速上手建议" style={sectionCardStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {quickStartSteps.map((item, index) => (
            <div
              key={item}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "10px 12px",
                borderRadius: 14,
                background: "var(--app-surface-soft)",
                border: "1px solid var(--app-border)",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, #14b8a6 78%, #ffffff 22%) 0%, color-mix(in srgb, #0f766e 82%, #ffffff 18%) 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <Text style={{ color: "var(--app-text)" }}>{item}</Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

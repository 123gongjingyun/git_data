import { Button, Col, Form, Input as AntInput, Modal, Row, Select, Typography } from "antd";
import type { FormInstance } from "antd/es/form";

const { Paragraph, Text } = Typography;

interface ProjectSupportModalsProps {
  createProjectOpen: boolean;
  projectForm: FormInstance;
  editingCurrentProject: boolean;
  onCancelProject: () => void;
  onSubmitProject: () => void;
  budgetModalOpen: boolean;
  onCloseBudgetModal: () => void;
  totalBudget: number;
  inprogressBudget: number;
  completedBudget: number;
  archivedBudget: number;
  createRelatedOpen: boolean;
  relatedForm: FormInstance;
  onCancelCreateRelated: () => void;
  onSubmitCreateRelated: () => void;
}

export function ProjectSupportModals(props: ProjectSupportModalsProps) {
  const {
    createProjectOpen,
    projectForm,
    editingCurrentProject,
    onCancelProject,
    onSubmitProject,
    budgetModalOpen,
    onCloseBudgetModal,
    totalBudget,
    inprogressBudget,
    completedBudget,
    archivedBudget,
    createRelatedOpen,
    relatedForm,
    onCancelCreateRelated,
    onSubmitCreateRelated,
  } = props;

  return (
    <>
      <Modal
        title="项目信息"
        open={createProjectOpen}
        onCancel={onCancelProject}
        onOk={onSubmitProject}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form layout="vertical" form={projectForm}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="项目名称 *"
                name="name"
                rules={[{ required: true, message: "请输入项目名称" }]}
              >
                <AntInput placeholder="请输入项目名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="客户名称 *"
                name="customer"
                rules={[{ required: true, message: "请输入客户名称" }]}
              >
                <AntInput placeholder="请输入客户名称" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="预算金额（万）" name="budget">
                <AntInput placeholder="请输入预算金额，例如 500" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority" initialValue="medium">
                <Select
                  options={[
                    { value: "low", label: "低" },
                    { value: "medium", label: "中" },
                    { value: "high", label: "高" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="项目状态" name="status" initialValue="inprogress">
                <Select
                  options={[
                    { value: "inprogress", label: "进行中" },
                    { value: "completed", label: "已完成" },
                    { value: "archived", label: "已归档" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="项目阶段" name="stage" initialValue="提案">
                <Select
                  options={[
                    { value: "发现", label: "发现" },
                    { value: "分析", label: "分析" },
                    { value: "提案", label: "提案" },
                    { value: "谈判", label: "谈判" },
                    { value: "签约", label: "签约" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="开始时间" name="startDate">
                <AntInput placeholder="例如：2024-01-05" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="销售负责人" name="salesOwner">
                <AntInput placeholder="例如：张三（销售）" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="所属行业负责人" name="industryOwner">
                <AntInput placeholder="例如：某行业负责人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="售前负责人" name="preSalesOwner">
                <AntInput placeholder="例如：王五（售前）" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="项目描述" name="description">
            <AntInput.TextArea
              rows={3}
              placeholder="请输入项目描述，例如项目背景、范围等信息"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="项目预算分布"
        open={budgetModalOpen}
        onCancel={onCloseBudgetModal}
        footer={null}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Paragraph>
            总预算： <Text strong>{totalBudget.toLocaleString("zh-CN")}万</Text>
          </Paragraph>
          <Paragraph>
            进行中项目预算： <Text>{inprogressBudget.toLocaleString("zh-CN")}万</Text>
          </Paragraph>
          <Paragraph>
            已完成项目预算： <Text>{completedBudget.toLocaleString("zh-CN")}万</Text>
          </Paragraph>
          <Paragraph>
            已归档项目预算： <Text>{archivedBudget.toLocaleString("zh-CN")}万</Text>
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            当前基于列表数据计算预算分布，后续接入后端实体（Project / Opportunity / Contract）后，可在此展示按状态 / 行业 / 负责人等维度拆分的真实预算结构。
          </Paragraph>
        </div>
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <Button type="primary" onClick={onCloseBudgetModal}>
            关闭
          </Button>
        </div>
      </Modal>

      <Modal
        title="新建关联商机"
        open={createRelatedOpen}
        onCancel={onCancelCreateRelated}
        onOk={onSubmitCreateRelated}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form layout="vertical" form={relatedForm}>
          <Form.Item
            label="商机名称"
            name="name"
            rules={[{ required: true, message: "请输入商机名称" }]}
          >
            <AntInput placeholder="例如：智慧园区二期网络扩容" />
          </Form.Item>
          <Form.Item label="金额（万）" name="amount">
            <AntInput placeholder="例如：300" />
          </Form.Item>
          <Form.Item label="阶段" name="stage" initialValue="solution_design">
            <Select
              options={[
                { value: "discovery", label: "发现" },
                { value: "solution_design", label: "方案设计" },
                { value: "proposal", label: "提案" },
                { value: "bidding", label: "投标" },
                { value: "negotiation", label: "谈判" },
                { value: "won", label: "中标" },
              ]}
            />
          </Form.Item>
          <Form.Item label="成交概率（0-100）" name="probability">
            <AntInput placeholder="例如：70" />
          </Form.Item>
          <Form.Item label="预计签约时间" name="expectedCloseDate">
            <AntInput placeholder="例如：2024-10-31" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

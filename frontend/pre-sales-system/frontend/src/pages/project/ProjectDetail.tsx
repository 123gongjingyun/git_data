import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Timeline,
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  message,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Spin,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { projectApi } from '../../services/api';

const { Option } = Select;

interface Project {
  id: string;
  projectNo: string;
  name: string;
  description?: string;
  customerName: string;
  customerContact?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: string;
  currentStage: string;
  priority: string;
  budget: number | null;
  expectedValue: number | null;
  startDate?: string;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    username: string;
    realName: string;
  };
  assignee?: {
    id: string;
    username: string;
    realName: string;
  } | null;
  opportunities: any[];
  solutions: any[];
  activities: any[];
}

const ProjectDetail: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isActivityModalVisible, setIsActivityModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [activityForm] = Form.useForm();

  // 加载项目详情
  const loadProjectDetail = async () => {
    try {
      setLoading(true);
      const response = await projectApi.getDetail(params.id as string);
      setProject(response);
    } catch (error) {
      console.error('加载项目详情失败:', error);
      message.error('加载项目详情失败');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectDetail();
  }, [params.id]);

  const activityColumns = [
    {
      title: '活动类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, { text: string; icon: string; color: string }> = {
          MEETING: { text: '会议', icon: '📅', color: 'blue' },
          CALL: { text: '电话', icon: '📞', color: 'green' },
          VISIT: { text: '拜访', icon: '🚗', color: 'orange' },
          EMAIL: { text: '邮件', icon: '📧', color: 'purple' },
          DEMO: { text: '演示', icon: '💻', color: 'cyan' },
          PRESENTATION: { text: '演示', icon: '🎤', color: 'magenta' },
          REVIEW: { text: '评审', icon: '📋', color: 'geekblue' },
        };
        const { text, icon, color } = typeMap[type] || { text: type, icon: '📝', color: 'default' };
        return <Tag color={color}>{icon} {text}</Tag>;
      },
    },
    {
      title: '活动内容',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '时长(分钟)',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number | null) => duration || '-',
    },
    {
      title: '执行人',
      dataIndex: 'createdBy',
      key: 'user',
      render: (userId: string, record: any) => {
        const user = record.creator?.realName || '-';
        return user;
      },
    },
    {
      title: '活动日期',
      dataIndex: 'activityDate',
      key: 'activityDate',
      render: (date: string) => date?.split('T')[0],
    },
  ];

  const handleBack = () => {
    navigate('/projects');
  };

  const handleEdit = () => {
    message.info('编辑功能开发中...');
  };

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该项目吗？此操作不可恢复。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await projectApi.delete(params.id as string);
          message.success('项目删除成功！');
          navigate('/projects');
        } catch (error: any) {
          console.error('删除项目失败:', error);
          message.error(error.response?.data?.message || '删除项目失败');
        }
      },
    });
  };

  const handleAddActivity = () => {
    setIsActivityModalVisible(true);
  };

  const handleActivityOk = async () => {
    try {
      const values = await activityForm.validateFields();
      const formattedValues = {
        ...values,
        activityDate: values.date?.format('YYYY-MM-DD'),
        nextActionDate: values.nextActionDate?.format('YYYY-MM-DD'),
      };

      await projectApi.addActivity(params.id as string, formattedValues);
      message.success('活动添加成功！');
      setIsActivityModalVisible(false);
      activityForm.resetFields();
      loadProjectDetail(); // 重新加载项目数据
    } catch (error: any) {
      console.error('添加活动失败:', error);
      message.error(error.response?.data?.message || '添加活动失败');
    }
  };

  // 渲染状态标签
  const renderStatusTag = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      LEAD: { text: '线索', color: 'default' },
      QUALIFIED: { text: '合格', color: 'blue' },
      IN_PROGRESS: { text: '进行中', color: 'processing' },
      WON: { text: '赢单', color: 'success' },
      LOST: { text: '输单', color: 'error' },
      CANCELLED: { text: '取消', color: 'default' },
    };
    const { text, color } = statusMap[status] || { text: status, color: 'default' };
    return <Tag color={color}>{text}</Tag>;
  };

  // 渲染阶段标签
  const renderStageTag = (stage: string) => {
    const stageMap: Record<string, { text: string; color: string }> = {
      DISCOVERY: { text: '发现', color: 'cyan' },
      ANALYSIS: { text: '分析', color: 'blue' },
      PROPOSAL: { text: '提案', color: 'purple' },
      NEGOTIATION: { text: '谈判', color: 'orange' },
      CLOSING: { text: '成交', color: 'green' },
    };
    const { text, color } = stageMap[stage] || { text: stage, color: 'default' };
    return <Tag color={color}>{text}</Tag>;
  };

  // 渲染优先级标签
  const renderPriorityTag = (priority: string) => {
    const priorityMap: Record<string, { text: string; color: string }> = {
      URGENT: { text: '紧急', color: 'red' },
      HIGH: { text: '高', color: 'orange' },
      MEDIUM: { text: '中', color: 'blue' },
      LOW: { text: '低', color: 'default' },
    };
    const { text, color } = priorityMap[priority] || { text: priority, color: 'default' };
    return <Tag color={color}>{text}</Tag>;
  };

  // 构建时间线数据
  const timelineData = project?.activities?.slice(0, 10).map(activity => ({
    date: activity.activityDate?.split('T')[0],
    title: activity.title,
    description: activity.description,
    status: 'completed',
    user: activity.creator?.realName,
  })) || [];

  if (loading) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: 100 }}>
        <Empty description="项目不存在" />
      </div>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <FileTextOutlined />
          项目概况
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="基本信息">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="项目编号">{project.projectNo}</Descriptions.Item>
                <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
                <Descriptions.Item label="客户名称">{project.customerName}</Descriptions.Item>
                <Descriptions.Item label="客户联系人">{project.customerContact || '-'}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{project.customerPhone || '-'}</Descriptions.Item>
                <Descriptions.Item label="联系邮箱">{project.customerEmail || '-'}</Descriptions.Item>
                <Descriptions.Item label="项目状态">{renderStatusTag(project.status)}</Descriptions.Item>
                <Descriptions.Item label="当前阶段">{renderStageTag(project.currentStage)}</Descriptions.Item>
                <Descriptions.Item label="优先级">{renderPriorityTag(project.priority)}</Descriptions.Item>
                <Descriptions.Item label="项目预算">{project.budget ? `¥${(project.budget / 10000).toFixed(0)}万` : '-'}</Descriptions.Item>
                <Descriptions.Item label="预期价值">{project.expectedValue ? `¥${(project.expectedValue / 10000).toFixed(0)}万` : '-'}</Descriptions.Item>
                <Descriptions.Item label="开始日期">{project.startDate?.split('T')[0] || '-'}</Descriptions.Item>
                <Descriptions.Item label="预计关闭日期">{project.expectedCloseDate?.split('T')[0] || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建人">{project.creator?.realName || '-'}</Descriptions.Item>
                <Descriptions.Item label="负责人">{project.assignee?.realName || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{project.createdAt.split('T')[0]}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{project.updatedAt.split('T')[0]}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="项目描述">
              <p style={{ lineHeight: 1.8, color: '#595959' }}>
                {project.description || '暂无描述'}
              </p>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="项目进展">
              {timelineData.length > 0 ? (
                <Timeline
                  items={timelineData.map(item => ({
                    color: item.status === 'completed' ? 'green' : 'blue',
                    dot: item.status === 'completed' ? <CheckCircleOutlined /> : <ClockCircleOutlined />,
                    children: (
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>
                          {item.title}
                          <span style={{ float: 'right', fontWeight: 'normal', color: '#8c8c8c' }}>
                            {item.date}
                          </span>
                        </div>
                        <div style={{ color: '#595959', marginBottom: 4 }}>{item.description}</div>
                        {item.user && (
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                            执行人: {item.user}
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Empty description="暂无活动记录" />
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'opportunities',
      label: (
        <span>
          <TeamOutlined />
          关联商机
        </span>
      ),
      children: (
        <Table
          columns={[
            { title: '商机编号', dataIndex: 'opportunityNo' },
            { title: '商机名称', dataIndex: 'name' },
            {
              title: '阶段',
              dataIndex: 'stage',
              render: (stage: string) => {
                const stageMap: Record<string, string> = {
                  ANALYSIS: '需求分析',
                  PROPOSAL: '方案提案',
                  NEGOTIATION: '商务谈判',
                  FINAL_REVIEW: '最终评审',
                };
                return stageMap[stage] || stage;
              },
            },
            {
              title: '成功概率',
              dataIndex: 'winProbability',
              render: (probability: number) => (
                <Progress percent={probability} size="small" style={{ width: 100 }} />
              ),
            },
            {
              title: '预期价值',
              dataIndex: 'expectedValue',
              render: (value: number | null) => value ? `¥${(value / 10000).toFixed(0)}万` : '-',
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (status: string) => {
                const statusMap: Record<string, { text: string; color: string }> = {
                  LEAD: { text: '线索', color: 'default' },
                  QUALIFIED: { text: '合格', color: 'blue' },
                  ACTIVE: { text: '活跃', color: 'processing' },
                  WON: { text: '赢单', color: 'success' },
                  LOST: { text: '输单', color: 'error' },
                };
                const { text, color } = statusMap[status] || { text: status, color: 'default' };
                return <Tag color={color}>{text}</Tag>;
              },
            },
          ]}
          dataSource={project.opportunities}
          rowKey="id"
          pagination={false}
        />
      ),
    },
    {
      key: 'solutions',
      label: (
        <span>
          <FileTextOutlined />
          解决方案
        </span>
      ),
      children: (
        <Table
          columns={[
            { title: '方案编号', dataIndex: 'solutionNo' },
            { title: '方案名称', dataIndex: 'name' },
            { title: '版本', dataIndex: 'version', render: (v: string) => `v${v}` },
            {
              title: '状态',
              dataIndex: 'status',
              render: (status: string) => {
                const statusMap: Record<string, { text: string; color: string }> = {
                  DRAFT: { text: '草稿', color: 'default' },
                  UNDER_REVIEW: { text: '审核中', color: 'processing' },
                  APPROVED: { text: '已批准', color: 'success' },
                  REJECTED: { text: '已拒绝', color: 'error' },
                  ARCHIVED: { text: '已归档', color: 'default' },
                };
                const { text, color } = statusMap[status] || { text: status, color: 'default' };
                return <Tag color={color}>{text}</Tag>;
              },
            },
            {
              title: '审批状态',
              dataIndex: 'approvalStatus',
              render: (status: string) => {
                const statusMap: Record<string, { text: string; color: string }> = {
                  PENDING: { text: '待审批', color: 'orange' },
                  APPROVED: { text: '已批准', color: 'success' },
                  REJECTED: { text: '已拒绝', color: 'error' },
                };
                const { text, color } = statusMap[status] || { text: status, color: 'default' };
                return <Tag color={color}>{text}</Tag>;
              },
            },
            { title: '创建时间', dataIndex: 'createdAt', render: (date: string) => date?.split('T')[0] },
          ]}
          dataSource={project.solutions}
          rowKey="id"
          pagination={false}
        />
      ),
    },
    {
      key: 'activities',
      label: (
        <span>
          <CalendarOutlined />
          活动记录
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddActivity}>
              添加活动
            </Button>
          </div>
          {project.activities && project.activities.length > 0 ? (
            <Table
              columns={activityColumns}
              dataSource={project.activities}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          ) : (
            <Empty description="暂无活动记录" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* 头部操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                返回
              </Button>
              <span style={{ fontSize: 18, fontWeight: 500 }}>
                {project.name}
              </span>
              {renderStatusTag(project.status)}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<EditOutlined />} onClick={handleEdit}>
                编辑
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                删除
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 项目内容 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* 添加活动弹窗 */}
      <Modal
        title="添加活动记录"
        open={isActivityModalVisible}
        onOk={handleActivityOk}
        onCancel={() => {
          setIsActivityModalVisible(false);
          activityForm.resetFields();
        }}
        width={700}
      >
        <Form form={activityForm} layout="vertical">
          <Form.Item
            name="type"
            label="活动类型"
            rules={[{ required: true, message: '请选择活动类型' }]}
          >
            <Select placeholder="请选择活动类型">
              <Option value="MEETING">会议</Option>
              <Option value="CALL">电话</Option>
              <Option value="VISIT">拜访</Option>
              <Option value="EMAIL">邮件</Option>
              <Option value="DEMO">演示</Option>
              <Option value="PRESENTATION">演示</Option>
              <Option value="REVIEW">评审</Option>
              <Option value="OTHER">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="活动标题"
            rules={[{ required: true, message: '请输入活动标题' }]}
          >
            <Input placeholder="请输入活动标题" />
          </Form.Item>

          <Form.Item name="description" label="活动描述">
            <Input.TextArea rows={4} placeholder="请输入活动描述" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="date" label="活动日期" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="duration" label="时长(分钟)" style={{ flex: 1 }}>
              <Input type="number" placeholder="请输入时长" />
            </Form.Item>
          </div>

          <Form.Item name="outcome" label="活动结果">
            <Input.TextArea rows={3} placeholder="请输入活动结果" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="nextAction" label="后续行动" style={{ flex: 1 }}>
              <Input placeholder="请输入后续行动计划" />
            </Form.Item>

            <Form.Item name="nextActionDate" label="计划日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="participants" label="参与人">
            <Input placeholder="请输入参与人，多个用逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectDetail;

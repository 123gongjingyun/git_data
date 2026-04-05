import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Form,
  Modal,
  Progress,
  Tooltip,
  message,
  Spin,
  Popconfirm,
  Row,
  Col,
  Steps,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TrophyOutlined,
  TrendingUpOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { opportunityApi, projectApi } from '../../services/api';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Step } = Steps;

interface Opportunity {
  id: string;
  opportunityNo: string;
  name: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
  };
  description?: string;
  status: string;
  stage: string;
  winProbability: number;
  expectedValue: number | null;
  weightedValue: number | null;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  requirements?: string;
  painPoints?: string;
  successCriteria?: string;
  competitors?: string;
  createdAt: string;
}

const OpportunityList: React.FC = () => {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [currentOpportunity, setCurrentOpportunity] = useState<Opportunity | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<any>({});
  const [form] = Form.useForm();

  // 加载商机列表
  const loadOpportunities = async (params: any = {}) => {
    try {
      setLoading(true);
      const response = await opportunityApi.getList({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
        ...params,
      });

      setOpportunities(response.data || []);
      setPagination({
        current: response.page || 1,
        pageSize: response.pageSize || 10,
        total: response.total || 0,
      });
    } catch (error) {
      console.error('加载商机列表失败:', error);
      message.error('加载商机列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  const columns = [
    {
      title: '商机编号',
      dataIndex: 'opportunityNo',
      key: 'opportunityNo',
      width: 130,
      fixed: 'left' as const,
    },
    {
      title: '商机名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Opportunity) => (
        <a onClick={() => handleViewDetail(record)}>{text}</a>
      ),
    },
    {
      title: '所属项目',
      dataIndex: 'project',
      key: 'project',
      width: 180,
      render: (project: any) => project?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          LEAD: { text: '线索', color: 'default' },
          QUALIFIED: { text: '合格', color: 'blue' },
          ACTIVE: { text: '活跃', color: 'processing' },
          WON: { text: '赢单', color: 'success' },
          LOST: { text: '输单', color: 'error' },
          CANCELLED: { text: '取消', color: 'default' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '转化流程',
      key: 'conversionFlow',
      width: 250,
      render: (text: any, record: Opportunity) => {
        const stageMap: Record<string, number> = {
          ANALYSIS: 0,
          PROPOSAL: 1,
          FINAL_REVIEW: 2,
        };
        const currentStep = stageMap[record.stage] ?? 0;
        return (
          <Steps size="small" current={currentStep}>
            <Step title="需求分析" icon={<CheckCircleOutlined />} />
            <Step title="方案提案" />
            <Step title="最终评审" />
          </Steps>
        );
      },
    },
    {
      title: '成功概率',
      dataIndex: 'winProbability',
      key: 'winProbability',
      width: 150,
      render: (value: number) => (
        <Tooltip title={`成功概率: ${value}%`}>
          <Progress
            percent={value}
            size="small"
            status={value >= 70 ? 'success' : value >= 40 ? 'normal' : 'exception'}
            format={(percent) => `${percent}%`}
          />
        </Tooltip>
      ),
    },
    {
      title: '预期价值',
      dataIndex: 'expectedValue',
      key: 'expectedValue',
      width: 120,
      render: (value: number | null) => value ? `¥${(value / 10000).toFixed(0)}万` : '-',
    },
    {
      title: '加权价值',
      dataIndex: 'weightedValue',
      key: 'weightedValue',
      width: 120,
      render: (value: number | null) => value ? (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>
          ¥{(value / 10000).toFixed(0)}万
        </span>
      ) : '-',
    },
    {
      title: '预计关闭日期',
      dataIndex: 'expectedCloseDate',
      key: 'expectedCloseDate',
      width: 130,
      render: (date: string | null) => date?.split('T')[0] || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => date.split('T')[0],
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (text: string, record: Opportunity) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个商机吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSearch = (values: any) => {
    const newFilters: any = {};

    if (values.keyword) newFilters.keyword = values.keyword;
    if (values.status) newFilters.status = values.status;
    if (values.stage) newFilters.stage = values.stage;
    if (values.probabilityRange) {
      if (values.probabilityRange === 'high') {
        newFilters.winProbability_gte = 70;
      } else if (values.probabilityRange === 'medium') {
        newFilters.winProbability_gte = 40;
        newFilters.winProbability_lt = 70;
      } else if (values.probabilityRange === 'low') {
        newFilters.winProbability_lt = 40;
      }
    }
    if (values.dateRange) {
      newFilters.startDate = values.dateRange[0]?.format('YYYY-MM-DD');
      newFilters.endDate = values.dateRange[1]?.format('YYYY-MM-DD');
    }

    setFilters(newFilters);
    setPagination({ ...pagination, current: 1 });
    loadOpportunities({ ...newFilters, page: 1 });
  };

  const handleReset = () => {
    setFilters({});
    setPagination({ ...pagination, current: 1 });
    loadOpportunities({ page: 1 });
  };

  const handleCreate = () => {
    setIsModalVisible(true);
  };

  const handleCreateOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formattedValues = {
        ...values,
        expectedCloseDate: values.expectedCloseDate?.format('YYYY-MM-DD'),
        weightedValue: values.expectedValue ? Math.round(values.expectedValue * (values.winProbability / 100)) : null,
      };

      await opportunityApi.create(formattedValues);
      message.success('商机创建成功!');
      setIsModalVisible(false);
      form.resetFields();
      loadOpportunities();
    } catch (error: any) {
      console.error('创建商机失败:', error);
      message.error(error.response?.data?.message || '创建商机失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (opportunity: Opportunity) => {
    setCurrentOpportunity(opportunity);
    setIsDetailModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await opportunityApi.delete(id);
      message.success('商机删除成功');
      loadOpportunities();
    } catch (error: any) {
      console.error('删除商机失败:', error);
      message.error(error.response?.data?.message || '删除商机失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const activeOpportunities = opportunities.filter(o => o.status === 'ACTIVE' || o.status === 'QUALIFIED');
  const totalExpectedValue = opportunities.reduce((sum, opp) => sum + (opp.expectedValue || 0), 0);
  const totalWeightedValue = opportunities.reduce((sum, opp) => sum + (opp.weightedValue || 0), 0);
  const avgProbability = opportunities.length > 0
    ? opportunities.reduce((sum, opp) => sum + opp.winProbability, 0) / opportunities.length
    : 0;

  return (
    <div>
      <Spin spinning={loading}>
        {/* 统计卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 16
        }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>活跃商机数</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {activeOpportunities.length}
                </div>
              </div>
              <TrophyOutlined style={{ fontSize: 32, color: '#1890ff' }} />
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>总预期价值</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  ¥{(totalExpectedValue / 10000).toFixed(0)}万
                </div>
              </div>
              <div style={{ fontSize: 24 }}>💰</div>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>总加权价值</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#13c2c2' }}>
                  ¥{(totalWeightedValue / 10000).toFixed(0)}万
                </div>
              </div>
              <TrendingUpOutlined style={{ fontSize: 32, color: '#13c2c2' }} />
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>平均成功概率</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                  {avgProbability.toFixed(0)}%
                </div>
              </div>
              <div style={{ fontSize: 24 }}>📊</div>
            </div>
          </Card>
        </div>

        {/* 商机列表 */}
        <Card
          title="商机管理"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建商机
            </Button>
          }
        >
          {/* 搜索栏 */}
          <Form
            layout="inline"
            onFinish={handleSearch}
            style={{ marginBottom: 16 }}
          >
            <Form.Item name="keyword">
              <Search
                placeholder="搜索商机名称/项目名称"
                allowClear
                style={{ width: 250 }}
              />
            </Form.Item>
            <Form.Item name="status">
              <Select placeholder="状态" allowClear style={{ width: 120 }}>
                <Select.Option value="LEAD">线索</Select.Option>
                <Select.Option value="QUALIFIED">合格</Select.Option>
                <Select.Option value="ACTIVE">活跃</Select.Option>
                <Select.Option value="WON">赢单</Select.Option>
                <Select.Option value="LOST">输单</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="stage">
              <Select placeholder="阶段" allowClear style={{ width: 140 }}>
                <Select.Option value="ANALYSIS">需求分析</Select.Option>
                <Select.Option value="PROPOSAL">方案提案</Select.Option>
                <Select.Option value="NEGOTIATION">商务谈判</Select.Option>
                <Select.Option value="FINAL_REVIEW">最终评审</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="probabilityRange">
              <Select placeholder="成功率" allowClear style={{ width: 140 }}>
                <Select.Option value="high">高 (≥70%)</Select.Option>
                <Select.Option value="medium">中 (40%-70%)</Select.Option>
                <Select.Option value="low">低 (<40%)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="dateRange">
              <RangePicker placeholder={['开始日期', '结束日期']} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
            </Form.Item>
            <Form.Item>
              <Button onClick={handleReset}>重置</Button>
            </Form.Item>
          </Form>

          {/* 商机表格 */}
          <Table
            columns={columns}
            dataSource={opportunities}
            rowKey="id"
            scroll={{ x: 1600 }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPagination({ ...pagination, current: page, pageSize: pageSize || 10 });
                loadOpportunities({ page });
              },
            }}
          />
        </Card>
      </Spin>

      {/* 创建商机弹窗 */}
      <Modal
        title="新建商机"
        open={isModalVisible}
        onOk={handleCreateOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={800}
        okText="确定"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="商机名称"
            rules={[{ required: true, message: '请输入商机名称' }]}
          >
            <Input placeholder="请输入商机名称" />
          </Form.Item>

          <Form.Item
            name="projectId"
            label="关联项目"
            rules={[{ required: true, message: '请选择关联项目' }]}
          >
            <Select placeholder="请选择关联项目">
              <Select.Option value="PRJ2024001">某银行数字化转型项目</Select.Option>
              <Select.Option value="PRJ2024002">制造业MES系统</Select.Option>
              <Select.Option value="PRJ2024003">电商平台升级</Select.Option>
              <Select.Option value="PRJ2024004">智慧园区项目</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="商机描述">
            <Input.TextArea rows={4} placeholder="请输入商机描述" />
          </Form.Item>

          <Form.Item name="requirements" label="客户需求">
            <Input.TextArea rows={4} placeholder="请输入客户主要需求和痛点" />
          </Form.Item>

          <Form.Item name="painPoints" label="客户痛点">
            <Input.TextArea rows={3} placeholder="请输入客户主要痛点" />
          </Form.Item>

          <Form.Item name="successCriteria" label="成功标准">
            <Input.TextArea rows={3} placeholder="请输入项目成功的标准" />
          </Form.Item>

          <Form.Item name="competitors" label="竞争对手">
            <Input placeholder="请输入竞争对手信息" />
          </Form.Item>

          <Form.Item name="expectedValue" label="预期价值">
            <Input type="number" placeholder="请输入预期价值" prefix="¥" />
          </Form.Item>

          <Form.Item name="winProbability" label="成功概率(%)" initialValue={50}>
            <Input type="number" placeholder="请输入成功概率" suffix="%" min={0} max={100} />
          </Form.Item>

          <Form.Item name="stage" label="当前阶段" initialValue="ANALYSIS">
            <Select placeholder="请选择阶段">
              <Select.Option value="ANALYSIS">需求分析</Select.Option>
              <Select.Option value="PROPOSAL">方案提案</Select.Option>
              <Select.Option value="NEGOTIATION">商务谈判</Select.Option>
              <Select.Option value="FINAL_REVIEW">最终评审</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="expectedCloseDate" label="预计关闭日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 商机详情弹窗 */}
      <Modal
        title="商机详情"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setCurrentOpportunity(null);
        }}
        width={900}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {currentOpportunity && (
          <div>
            {/* 3步转化流程 */}
            <Card style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>
                转化流程
              </div>
              <Steps current={
                currentOpportunity.stage === 'ANALYSIS' ? 0 :
                currentOpportunity.stage === 'PROPOSAL' ? 1 :
                currentOpportunity.stage === 'FINAL_REVIEW' ? 2 : 0
              }>
                <Step title="需求分析" description="了解客户需求与痛点" icon={<CheckCircleOutlined />} />
                <Step title="方案提案" description="制定并提交技术方案" />
                <Step title="最终评审" description="商务谈判与合同评审" />
              </Steps>
            </Card>

            {/* 商机基本信息 */}
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="商机编号">{currentOpportunity.opportunityNo}</Descriptions.Item>
                <Descriptions.Item label="商机名称">{currentOpportunity.name}</Descriptions.Item>
                <Descriptions.Item label="关联项目">{currentOpportunity.project?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={
                    currentOpportunity.status === 'ACTIVE' ? 'processing' :
                    currentOpportunity.status === 'WON' ? 'success' :
                    currentOpportunity.status === 'LOST' ? 'error' : 'default'
                  }>
                    {currentOpportunity.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="当前阶段">{currentOpportunity.stage}</Descriptions.Item>
                <Descriptions.Item label="成功概率">
                  <Progress percent={currentOpportunity.winProbability} size="small" style={{ width: 150 }} />
                </Descriptions.Item>
                <Descriptions.Item label="预期价值">
                  {currentOpportunity.expectedValue ? `¥${(currentOpportunity.expectedValue / 10000).toFixed(0)}万` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="加权价值" span={2}>
                  {currentOpportunity.weightedValue ? (
                    <span style={{ color: '#52c41a', fontWeight: 500 }}>
                      ¥{(currentOpportunity.weightedValue / 10000).toFixed(0)}万
                    </span>
                  ) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="预计关闭日期">{currentOpportunity.expectedCloseDate?.split('T')[0] || '-'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{currentOpportunity.createdAt.split('T')[0]}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 需求信息 */}
            <Card title="需求与痛点" style={{ marginBottom: 16 }}>
              <Descriptions bordered column={1}>
                <Descriptions.Item label="客户需求">
                  {currentOpportunity.requirements || '暂无'}
                </Descriptions.Item>
                <Descriptions.Item label="客户痛点">
                  {currentOpportunity.painPoints || '暂无'}
                </Descriptions.Item>
                <Descriptions.Item label="成功标准">
                  {currentOpportunity.successCriteria || '暂无'}
                </Descriptions.Item>
                <Descriptions.Item label="竞争对手">
                  {currentOpportunity.competitors || '暂无'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 商机描述 */}
            {currentOpportunity.description && (
              <Card title="商机描述">
                <p style={{ lineHeight: 1.8, color: '#595959' }}>
                  {currentOpportunity.description}
                </p>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OpportunityList;

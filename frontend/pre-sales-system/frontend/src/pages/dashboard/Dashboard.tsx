import React from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Progress, Space, Button } from 'antd';
import {
  ProjectOutlined,
  BulbOutlined,
  SolutionOutlined,
  FileTextOutlined,
  DollarOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';

const Dashboard: React.FC = () => {
  // 模拟数据
  const statistics = [
    {
      title: '进行中项目',
      value: 24,
      icon: <ProjectOutlined style={{ color: '#1890ff' }} />,
      prefix: '',
      suffix: '',
      trend: 12,
      isUp: true,
    },
    {
      title: '活跃商机',
      value: 18,
      icon: <BulbOutlined style={{ color: '#52c41a' }} />,
      prefix: '',
      suffix: '',
      trend: 8,
      isUp: true,
    },
    {
      title: '解决方案',
      value: 32,
      icon: <SolutionOutlined style={{ color: '#722ed1' }} />,
      prefix: '',
      suffix: '',
      trend: 5,
      isUp: false,
    },
    {
      title: '投标项目',
      value: 7,
      icon: <FileTextOutlined style={{ color: '#fa8c16' }} />,
      prefix: '',
      suffix: '',
      trend: 2,
      isUp: true,
    },
    {
      title: '预计签约金额',
      value: 12800000,
      icon: <DollarOutlined style={{ color: '#13c2c2' }} />,
      prefix: '¥',
      suffix: '',
      trend: 15,
      isUp: true,
      precision: 0,
    },
    {
      title: '本月签约',
      value: 3200000,
      icon: <TrophyOutlined style={{ color: '#eb2f96' }} />,
      prefix: '¥',
      suffix: '',
      trend: 20,
      isUp: true,
      precision: 0,
    },
  ];

  const recentProjects = [
    {
      key: '1',
      name: '某银行数字化转型项目',
      customer: '某某银行',
      status: 'in_progress',
      stage: 'proposal',
      budget: 5000000,
      probability: 65,
      days: 15,
    },
    {
      key: '2',
      name: '制造业MES系统',
      customer: '某某制造企业',
      status: 'in_progress',
      stage: 'analysis',
      budget: 2800000,
      probability: 45,
      days: 22,
    },
    {
      key: '3',
      name: '电商平台升级',
      customer: '某某电商公司',
      status: 'qualified',
      stage: 'discovery',
      budget: 1200000,
      probability: 30,
      days: 8,
    },
    {
      key: '4',
      name: '智慧园区项目',
      customer: '某某地产集团',
      status: 'in_progress',
      stage: 'negotiation',
      budget: 8000000,
      probability: 80,
      days: 5,
    },
    {
      key: '5',
      name: '数据中心建设',
      customer: '某某科技公司',
      status: 'in_progress',
      stage: 'proposal',
      budget: 3500000,
      probability: 55,
      days: 12,
    },
  ];

  const upcomingTasks = [
    {
      key: '1',
      task: '完成技术方案评审',
      project: '某银行数字化转型项目',
      date: '2024-01-20',
      priority: 'high',
    },
    {
      key: '2',
      task: '提交投标文件',
      project: '智慧园区项目',
      date: '2024-01-18',
      priority: 'urgent',
    },
    {
      key: '3',
      task: '客户需求调研会议',
      project: '制造业MES系统',
      date: '2024-01-19',
      priority: 'medium',
    },
    {
      key: '4',
      task: '合同谈判',
      project: '电商平台升级',
      date: '2024-01-22',
      priority: 'high',
    },
  ];

  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '客户',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          lead: { text: '线索', color: 'default' },
          qualified: { text: '合格', color: 'blue' },
          in_progress: { text: '进行中', color: 'processing' },
          won: { text: '赢单', color: 'success' },
          lost: { text: '输单', color: 'error' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: string) => {
        const stageMap: Record<string, string> = {
          discovery: '发现',
          analysis: '分析',
          proposal: '提案',
          negotiation: '谈判',
          closing: '成交',
        };
        return stageMap[stage] || stage;
      },
    },
    {
      title: '预算',
      dataIndex: 'budget',
      key: 'budget',
      render: (value: number) => `¥${(value / 10000).toFixed(0)}万`,
    },
    {
      title: '成功概率',
      dataIndex: 'probability',
      key: 'probability',
      render: (value: number) => (
        <Progress percent={value} size="small" status={value >= 70 ? 'success' : 'normal'} />
      ),
    },
    {
      title: '剩余天数',
      dataIndex: 'days',
      key: 'days',
      render: (days: number) => (
        <Space>
          <ClockCircleOutlined style={{ color: days <= 5 ? '#ff4d4f' : '#1890ff' }} />
          <span>{days}天</span>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Button type="link" size="small">
          查看详情
        </Button>
      ),
    },
  ];

  const taskColumns = [
    {
      title: '任务',
      dataIndex: 'task',
      key: 'task',
    },
    {
      title: '关联项目',
      dataIndex: 'project',
      key: 'project',
    },
    {
      title: '截止日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => {
        const priorityMap: Record<string, { text: string; color: string }> = {
          urgent: { text: '紧急', color: 'red' },
          high: { text: '高', color: 'orange' },
          medium: { text: '中', color: 'blue' },
          low: { text: '低', color: 'default' },
        };
        const { text, color } = priorityMap[priority] || { text: priority, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Button type="link" size="small">
          完成
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        {statistics.map((stat) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={stat.title}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                precision={stat.precision || 0}
                valueStyle={{
                  color: stat.isUp ? '#3f8600' : '#cf1322',
                  fontSize: '20px'
                }}
                prefix={React.cloneElement(stat.icon as React.ReactElement, {
                  style: { marginRight: 8 }
                })}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                {stat.isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {` ${stat.trend}% 较上月`}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title="最近项目"
            extra={<Button type="link">查看全部</Button>}
          >
            <Table
              dataSource={recentProjects}
              columns={projectColumns}
              pagination={false}
              scroll={{ x: true }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title="待办任务"
            extra={<Button type="link">查看全部</Button>}
          >
            <Table
              dataSource={upcomingTasks}
              columns={taskColumns}
              pagination={false}
              showHeader={false}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="本月业绩趋势">
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c8c' }}>
              图表区域（可集成ECharts或其他图表库）
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

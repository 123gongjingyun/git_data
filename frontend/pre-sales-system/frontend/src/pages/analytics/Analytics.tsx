import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Statistic,
  Table,
  Progress,
  message,
  Spin,
  Dropdown,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  TrophyOutlined,
  DollarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { analyticsApi } from '../../services/api';
import {
  exportToExcel,
  exportToPDF,
  exportOpportunities,
} from '../../utils/export';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface DashboardStats {
  totalOpportunities: number;
  totalValue: number;
  avgCycle: number;
  successRate: number;
  opportunityGrowth: number;
  valueGrowth: number;
  cycleGrowth: number;
  successGrowth: number;
}

interface FunnelData {
  stage: string;
  count: number;
  value: number;
}

interface TrendData {
  month: string;
  opportunities: number;
  won: number;
  lost: number;
  active: number;
  value: number;
}

interface DistributionData {
  name: string;
  value: number;
}

interface TeamPerformance {
  id: string;
  name: string;
  opportunities: number;
  won: number;
  lost: number;
  active: number;
  value: number;
  successRate: number;
}

const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<any>([]);
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, funnelRes, trendRes, distributionRes, teamRes] = await Promise.all([
        analyticsApi.getDashboardStats(),
        analyticsApi.getFunnelData({ timeRange }),
        analyticsApi.getTrendData({ timeRange }),
        analyticsApi.getDistributionData({ timeRange }),
        analyticsApi.getProjectProgress({ timeRange }),
      ]);

      setStats(statsRes);
      setFunnelData(funnelRes.data || []);
      setTrendData(trendRes.data || []);
      setDistributionData(distributionRes.data || []);
      setTeamPerformance(teamRes.data || []);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const funnelOption = {
    title: {
      text: '销售漏斗分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}个'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '漏斗',
        type: 'funnel',
        left: '20%',
        top: 60,
        bottom: 60,
        width: '60%',
        min: 0,
        max: 120,
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside'
        },
        labelLine: {
          length: 10,
          lineStyle: {
            width: 1,
            type: 'solid'
          }
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1
        },
        emphasis: {
          label: {
            fontSize: 20
          }
        },
        data: funnelData.length > 0 ? funnelData.map(item => ({
          value: item.count,
          name: item.stage
        })) : []
      }
    ]
  };

  const trendOption = {
    title: {
      text: '业绩趋势分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['商机数', '赢单数', '输单数', '签约金额'],
      bottom: 0
    },
    xAxis: {
      type: 'category',
      data: trendData.length > 0 ? trendData.map(item => item.month) : []
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        position: 'left'
      },
      {
        type: 'value',
        name: '金额(万)',
        position: 'right'
      }
    ],
    series: [
      {
        name: '商机数',
        type: 'bar',
        data: trendData.length > 0 ? trendData.map(item => item.opportunities) : [],
        itemStyle: { color: '#1890ff' }
      },
      {
        name: '赢单数',
        type: 'bar',
        data: trendData.length > 0 ? trendData.map(item => item.won) : [],
        itemStyle: { color: '#52c41a' }
      },
      {
        name: '输单数',
        type: 'bar',
        data: trendData.length > 0 ? trendData.map(item => item.lost) : [],
        itemStyle: { color: '#ff4d4f' }
      },
      {
        name: '签约金额',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.length > 0 ? trendData.map(item => (item.value / 10000).toFixed(0)) : [],
        itemStyle: { color: '#fa8c16' },
        lineStyle: { width: 3 }
      }
    ]
  };

  const distributionOption = {
    title: {
      text: '行业分布分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '行业分布',
        type: 'pie',
        radius: '50%',
        data: distributionData.length > 0 ? distributionData : [],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 100,
    },
    {
      title: '商机数',
      dataIndex: 'opportunities',
      key: 'opportunities',
      width: 100,
      render: (value: number) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    {
      title: '赢单',
      dataIndex: 'won',
      key: 'won',
      width: 80,
      render: (value: number) => <span style={{ color: '#52c41a' }}>{value}</span>,
    },
    {
      title: '输单',
      dataIndex: 'lost',
      key: 'lost',
      width: 80,
      render: (value: number) => <span style={{ color: '#ff4d4f' }}>{value}</span>,
    },
    {
      title: '进行中',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (value: number) => <span style={{ color: '#1890ff' }}>{value}</span>,
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 120,
      render: (value: number) => (
        <Progress 
          percent={value} 
          size="small"
          status={value >= 60 ? 'success' : value >= 40 ? 'normal' : 'exception'}
          format={(percent) => `${percent?.toFixed(0)}%`}
        />
      ),
    },
    {
      title: '签约金额(万)',
      dataIndex: 'value',
      key: 'value',
      width: 120,
      render: (value: number) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>
          ¥{(value / 10000).toFixed(0)}万
        </span>
      ),
    },
  ];

  const handleExport = () => {
    message.success('导出报表功能开发中...');
  };

  const handleRefresh = () => {
    loadData();
    message.success('数据已刷新');
  };

  return (
    <div>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['开始日期', '结束日期']}
            />
          </Col>
          <Col>
            <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
              <Option value="week">最近一周</Option>
              <Option value="month">最近一月</Option>
              <Option value="quarter">最近三月</Option>
              <Option value="year">最近一年</Option>
            </Select>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                刷新数据
              </Button>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'excel',
                      icon: <FileExcelOutlined />,
                      label: '导出Excel',
                      onClick: () => handleExport('excel'),
                    },
                    {
                      key: 'pdf',
                      icon: <FilePdfOutlined />,
                      label: '导出PDF',
                      onClick: () => handleExport('pdf'),
                    },
                  ],
                }}
              >
                <Button>
                  导出报表
                </Button>
              </Dropdown>
            </Space>
          </Col>
          <Col>
            <Button onClick={handleExport}>
              导出报表
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 关键指标 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总商机数"
              value={stats?.totalOpportunities || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix={
                stats?.opportunityGrowth !== undefined && (
                  <span style={{ fontSize: 14, color: stats.opportunityGrowth >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {stats.opportunityGrowth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(stats.opportunityGrowth)}%
                  </span>
                )
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="签约金额"
              value={stats?.totalValue || 0}
              prefix={<DollarOutlined />}
              precision={0}
              formatter={(value) => `¥${(Number(value) / 10000).toFixed(0)}万`}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                stats?.valueGrowth !== undefined && (
                  <span style={{ fontSize: 14, color: stats.valueGrowth >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {stats.valueGrowth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(stats.valueGrowth)}%
                  </span>
                )
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均周期"
              value={stats?.avgCycle || 0}
              prefix={<ClockCircleOutlined />}
              suffix="天"
              valueStyle={{ color: '#fa8c16' }}
              suffix={
                stats?.cycleGrowth !== undefined && (
                  <span style={{ fontSize: 14, color: stats.cycleGrowth <= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {stats.cycleGrowth <= 0 ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                    {Math.abs(stats.cycleGrowth)}%
                  </span>
                )
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="成功率"
              value={stats?.successRate || 0}
              prefix={<TrophyOutlined />}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
              suffix={
                stats?.successGrowth !== undefined && (
                  <span style={{ fontSize: 14, color: stats.successGrowth >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    {stats.successGrowth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(stats.successGrowth)}%
                  </span>
                )
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="销售漏斗分析">
            <ReactECharts option={funnelOption} style={{ height: 400 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="业绩趋势分析">
            <ReactECharts option={trendOption} style={{ height: 400 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="行业分布分析">
            <ReactECharts option={distributionOption} style={{ height: 400 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="风险分析">
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>高风险项目</span>
                  <span style={{ color: '#ff4d4f' }}>3个</span>
                </div>
                <Progress percent={15} status="exception" showInfo={false} />
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>中风险项目</span>
                  <span style={{ color: '#fa8c16' }}>8个</span>
                </div>
                <Progress percent={40} status="active" showInfo={false} />
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>低风险项目</span>
                  <span style={{ color: '#52c41a' }}>9个</span>
                </div>
                <Progress percent={45} status="success" showInfo={false} />
              </div>

              <div style={{ marginTop: 24, padding: 16, background: '#fff7e6', borderRadius: 4, borderLeft: '3px solid #fa8c16' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
                  <span style={{ fontWeight: 500 }}>风险提示</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#595959' }}>
                  <li>5个项目即将到期，需要尽快跟进</li>
                  <li>3个项目客户需求变更频繁</li>
                  <li>2个项目竞争对手报价较低</li>
                </ul>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 团队业绩 */}
      <Card title="团队业绩排行">
        <Table
          columns={columns}
          dataSource={teamPerformance}
          rowKey="id"
          pagination={false}
          scroll={{ x: true }}
          summary={(data) => {
            const totalOpportunities = data.reduce((sum, item) => sum + item.opportunities, 0);
            const totalWon = data.reduce((sum, item) => sum + item.won, 0);
            const totalValue = data.reduce((sum, item) => sum + item.value, 0);
            const avgSuccessRate = data.length > 0 ? data.reduce((sum, item) => sum + item.successRate, 0) / data.length : 0;

            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <strong>总计</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <strong>{totalOpportunities}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <strong style={{ color: '#52c41a' }}>{totalWon}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <strong style={{ color: '#ff4d4f' }}>{totalOpportunities - totalWon - data.reduce((sum, item) => sum + item.active, 0)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <strong style={{ color: '#1890ff' }}>{data.reduce((sum, item) => sum + item.active, 0)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <strong>{avgSuccessRate.toFixed(0)}%</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6}>
                    <strong style={{ color: '#1890ff' }}>¥{(totalValue / 10000).toFixed(0)}万</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>
      </Spin>
    </div>
  );
};

export default Analytics;

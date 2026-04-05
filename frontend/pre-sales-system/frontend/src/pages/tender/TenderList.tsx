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
  message,
  Tooltip,
  Spin,
  Popconfirm,
  Progress,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { tenderApi } from '../../services/api';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface Tender {
  id: string;
  tenderNo: string;
  name: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
    customerName: string;
  };
  tenderType: string;
  description?: string;
  bidPrice?: number;
  currency?: string;
  depositAmount?: number;
  announcementDate?: string;
  submissionDate?: string;
  openingDate?: string;
  status: string;
  result?: string;
  bidLeader?: string;
  technicalLead?: string;
  commercialLead?: string;
  createdAt: string;
  contracts?: any[];
}

const TenderList: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [currentTender, setCurrentTender] = useState<Tender | null>(null);
  const [editItem, setEditItem] = useState<Tender | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<any>({});
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const loadTenders = async (params: any = {}) => {
    try {
      setLoading(true);
      const response = await tenderApi.getList({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
        ...params,
      });

      setTenders(response.data || []);
      setPagination({
        current: response.page || 1,
        pageSize: response.pageSize || 10,
        total: response.total || 0,
      });
    } catch (error) {
      console.error('加载投标列表失败:', error);
      message.error('加载投标列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenders();
  }, []);

  const columns = [
    {
      title: '招标编号',
      dataIndex: 'tenderNo',
      key: 'tenderNo',
      width: 150,
      fixed: 'left' as const,
    },
    {
      title: '招标名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Tender) => (
        <a onClick={() => handleViewDetail(record)}>{text}</a>
      ),
    },
    {
      title: '项目',
      dataIndex: 'project',
      key: 'project',
      width: 180,
      render: (project: any) => (
        <Space direction="vertical" size={0}>
          <span>{project?.name || '-'}</span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {project?.customerName || '-'}
          </span>
        </Space>
      ),
    },
    {
      title: '招标类型',
      dataIndex: 'tenderType',
      key: 'tenderType',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          PUBLIC: { text: '公开招标', color: 'blue' },
          INVITATIONAL: { text: '邀请招标', color: 'green' },
          COMPETITIVE: { text: '竞争性谈判', color: 'orange' },
          DIRECT: { text: '直接采购', color: 'purple' },
        };
        const { text, color } = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '投标价格',
      dataIndex: 'bidPrice',
      key: 'bidPrice',
      width: 120,
      render: (price: number | null) =>
        price ? (
          <span style={{ fontWeight: 500 }}>
            {price?.toLocaleString()}元
          </span>
        ) : '-',
    },
    {
      title: '保证金',
      dataIndex: 'depositAmount',
      key: 'depositAmount',
      width: 120,
      render: (amount: number | null) =>
        amount ? (
          <span style={{ color: '#fa8c16' }}>
            {amount.toLocaleString()}元
          </span>
        ) : '-',
    },
    {
      title: '投标截止',
      dataIndex: 'submissionDate',
      key: 'submissionDate',
      width: 120,
      render: (date: string | null) => (date ? date.split('T')[0] : '-'),
    },
    {
      title: '开标日期',
      dataIndex: 'openingDate',
      key: 'openingDate',
      width: 120,
      render: (date: string | null) => (date ? date.split('T')[0] : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          PREPARING: { text: '准备中', color: 'default' },
          SUBMITTED: { text: '已提交', color: 'processing' },
          UNDER_REVIEW: { text: '评审中', color: 'warning' },
          AWARDED: { text: '已中标', color: 'success' },
          NOT_AWARDED: { text: '未中标', color: 'error' },
          CANCELLED: { text: '已取消', color: 'default' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      width: 100,
      render: (result: string | null) => {
        if (!result) return '-';
        const resultMap: Record<string, { text: string; color: string }> = {
          WON: { text: '中标', color: 'success' },
          LOST: { text: '未中标', color: 'error' },
          IN_PROGRESS: { text: '进行中', color: 'processing' },
        };
        const { text, color } = resultMap[result] || { text: result, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
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
      width: 180,
      fixed: 'right' as const,
      render: (text: string, record: Tender) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个投标吗?"
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
    if (values.type) newFilters.type = values.type;
    if (values.dateRange) {
      newFilters.startDate = values.dateRange[0]?.format('YYYY-MM-DD');
      newFilters.endDate = values.dateRange[1]?.format('YYYY-MM-DD');
    }

    setFilters(newFilters);
    setPagination({ ...pagination, current: 1 });
    loadTenders({ ...newFilters, page: 1 });
  };

  const handleReset = () => {
    setFilters({});
    setPagination({ ...pagination, current: 1 });
    loadTenders({ page: 1 });
  };

  const handleCreate = () => {
    setIsModalVisible(true);
  };

  const handleCreateOk = async () => {
    try {
      const values = await createForm.validateFields();
      setLoading(true);

      await tenderApi.create(values);
      message.success('投标创建成功!');
      setIsModalVisible(false);
      createForm.resetFields();
      loadTenders();
    } catch (error: any) {
      console.error('创建投标失败:', error);
      message.error(error.response?.data?.message || '创建投标失败');
    } finally {
      setLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    createForm.resetFields();
  };

  const handleViewDetail = (tender: Tender) => {
    setCurrentTender(tender);
    setIsDetailModalVisible(true);
  };

  const handleEdit = (tender: Tender) => {
    setEditItem(tender);
    editForm.setFieldsValue({
      ...tender,
      submissionDate: tender.submissionDate ? tender.submissionDate.split('T')[0] : null,
      openingDate: tender.openingDate ? tender.openingDate.split('T')[0] : null,
      announcementDate: tender.announcementDate ? tender.announcementDate.split('T')[0] : null,
    });
    setIsEditModalVisible(true);
  };

  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);

      await tenderApi.update(editItem!.id, values);
      message.success('投标更新成功!');
      setIsEditModalVisible(false);
      editForm.resetFields();
      setEditItem(null);
      loadTenders();
    } catch (error: any) {
      console.error('更新投标失败:', error);
      message.error(error.response?.data?.message || '更新投标失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
    setEditItem(null);
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await tenderApi.delete(id);
      message.success('投标删除成功');
      loadTenders();
    } catch (error: any) {
      console.error('删除投标失败:', error);
      message.error(error.response?.data?.message || '删除投标失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusCount = () => {
    return {
      preparing: tenders.filter((t) => t.status === 'PREPARING').length,
      submitted: tenders.filter((t) => t.status === 'SUBMITTED').length,
      underReview: tenders.filter((t) => t.status === 'UNDER_REVIEW').length,
      awarded: tenders.filter((t) => t.status === 'AWARDED').length,
      notAwarded: tenders.filter((t) => t.status === 'NOT_AWARDED').length,
      total: tenders.length,
    };
  };

  const statusCount = getStatusCount();

  return (
    <Card
      title="投标管理"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => loadTenders()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建投标
          </Button>
        </Space>
      }
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="总数"
              value={statusCount.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="准备中"
              value={statusCount.preparing}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="已提交"
              value={statusCount.submitted}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="评审中"
              value={statusCount.underReview}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="已中标"
              value={statusCount.awarded}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="未中标"
              value={statusCount.notAwarded}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 搜索栏 */}
        <Form layout="inline" onFinish={handleSearch} style={{ marginBottom: 16 }}>
          <Form.Item name="keyword">
            <Search
              placeholder="搜索招标名称/编号"
              allowClear
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 120 }}>
              <Option value="PREPARING">准备中</Option>
              <Option value="SUBMITTED">已提交</Option>
              <Option value="UNDER_REVIEW">评审中</Option>
              <Option value="AWARDED">已中标</Option>
              <Option value="NOT_AWARDED">未中标</Option>
            </Select>
          </Form.Item>
          <Form.Item name="type">
            <Select placeholder="招标类型" allowClear style={{ width: 140 }}>
              <Option value="PUBLIC">公开招标</Option>
              <Option value="INVITATIONAL">邀请招标</Option>
              <Option value="COMPETITIVE">竞争性谈判</Option>
              <Option value="DIRECT">直接采购</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              搜索
            </Button>
          </Form.Item>
          <Form.Item>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Form.Item>
        </Form>

        {/* 投标表格 */}
        <Table
          columns={columns}
          dataSource={tenders}
          rowKey="id"
          scroll={{ x: 2000 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize: pageSize || 10 });
              loadTenders({ page });
            },
          }}
        />
      </Spin>

      {/* 创建投标弹窗 */}
      <Modal
        title="新建投标"
        open={isModalVisible}
        onOk={handleCreateOk}
        onCancel={handleModalCancel}
        width={800}
        okText="确定"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="name"
            label="招标名称"
            rules={[{ required: true, message: '请输入招标名称' }]}
          >
            <Input placeholder="请输入招标名称" />
          </Form.Item>

          <Form.Item
            name="projectId"
            label="关联项目"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select placeholder="请选择项目">
              {/* 动态加载项目列表 */}
            </Select>
          </Form.Item>

          <Form.Item name="tenderType" label="招标类型" rules={[{ required: true }]}>
            <Select placeholder="请选择招标类型">
              <Option value="PUBLIC">公开招标</Option>
              <Option value="INVITATIONAL">邀请招标</Option>
              <Option value="COMPETITIVE">竞争性谈判</Option>
              <Option value="DIRECT">直接采购</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="招标描述">
            <Input.TextArea rows={4} placeholder="请输入招标描述" />
          </Form.Item>

          <Form.Item name="bidPrice" label="投标价格">
            <Input type="number" placeholder="请输入投标价格" />
          </Form.Item>

          <Form.Item name="depositAmount" label="保证金金额">
            <Input type="number" placeholder="请输入保证金金额" />
          </Form.Item>

          <Form.Item name="announcementDate" label="招标公告日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="submissionDate" label="投标截止日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="openingDate" label="开标日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="bidLeader" label="投标负责人">
            <Input placeholder="请输入投标负责人" />
          </Form.Item>

          <Form.Item name="technicalLead" label="技术负责人">
            <Input placeholder="请输入技术负责人" />
          </Form.Item>

          <Form.Item name="commercialLead" label="商务负责人">
            <Input placeholder="请输入商务负责人" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 投标详情弹窗 */}
      <Modal
        title="投标详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {currentTender && (
          <div>
            <h3 style={{ marginBottom: 16 }}>{currentTender.name}</h3>
            
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {currentTender.bidPrice?.toLocaleString()}元
                    </div>
                    <div style={{ color: '#8c8c8c' }}>投标价格</div>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                      {currentTender.depositAmount?.toLocaleString()}元
                    </div>
                    <div style={{ color: '#8c8c8c' }}>保证金</div>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: currentTender.status === 'AWARDED' ? '#52c41a' : '#1890ff' }}>
                      {currentTender.project?.name}
                    </div>
                    <div style={{ color: '#8c8c8c' }}>关联项目</div>
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>基本信息</h4>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>招标编号:</span>
                    <span>{currentTender.tenderNo}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>招标类型:</span>
                    <span>{currentTender.tenderType}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>投标截止:</span>
                    <span>{currentTender.submissionDate?.split('T')[0] || '-'}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>开标日期:</span>
                    <span>{currentTender.openingDate?.split('T')[0] || '-'}</span>
                  </div>
                </Col>
              </Row>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>负责人</h4>
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>投标负责人:</span>
                    <span>{currentTender.bidLeader || '-'}</span>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>技术负责人:</span>
                    <span>{currentTender.technicalLead || '-'}</span>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>商务负责人:</span>
                    <span>{currentTender.commercialLead || '-'}</span>
                  </div>
                </Col>
              </Row>
            </div>

            {currentTender.description && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 8 }}>招标描述</h4>
                <p style={{ color: '#595959', lineHeight: 1.8 }}>
                  {currentTender.description}
                </p>
              </div>
            )}

            {currentTender.contracts && currentTender.contracts.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 8 }}>关联合同</h4>
                <Table
                  dataSource={currentTender.contracts}
                  columns={[
                    {
                      title: '合同编号',
                      dataIndex: 'contractNo',
                      key: 'contractNo',
                    },
                    {
                      title: '合同金额',
                      dataIndex: 'contractValue',
                      key: 'contractValue',
                      render: (value: number) =>
                        `${value?.toLocaleString()}元`,
                    },
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 编辑投标弹窗 */}
      <Modal
        title="编辑投标"
        open={isEditModalVisible}
        onOk={handleEditOk}
        onCancel={handleEditModalCancel}
        width={800}
        okText="确定"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item name="name" label="招标名称" rules={[{ required: true }]}>
            <Input placeholder="请输入招标名称" />
          </Form.Item>
          <Form.Item name="tenderType" label="招标类型" rules={[{ required: true }]}>
            <Select placeholder="请选择招标类型">
              <Option value="PUBLIC">公开招标</Option>
              <Option value="INVITATIONAL">邀请招标</Option>
              <Option value="COMPETITIVE">竞争性谈判</Option>
              <Option value="DIRECT">直接采购</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="招标描述">
            <Input.TextArea rows={4} placeholder="请输入招标描述" />
          </Form.Item>
          <Form.Item name="bidPrice" label="投标价格">
            <Input type="number" placeholder="请输入投标价格" />
          </Form.Item>
          <Form.Item name="depositAmount" label="保证金金额">
            <Input type="number" placeholder="请输入保证金金额" />
          </Form.Item>
          <Form.Item name="submissionDate" label="投标截止日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="openingDate" label="开标日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select placeholder="请选择状态">
              <Option value="PREPARING">准备中</Option>
              <Option value="SUBMITTED">已提交</Option>
              <Option value="UNDER_REVIEW">评审中</Option>
              <Option value="AWARDED">已中标</Option>
              <Option value="NOT_AWARDED">未中标</Option>
              <Option value="CANCELLED">已取消</Option>
            </Select>
          </Form.Item>
          <Form.Item name="result" label="结果">
            <Select placeholder="请选择结果" allowClear>
              <Option value="WON">中标</Option>
              <Option value="LOST">未中标</Option>
              <Option value="IN_PROGRESS">进行中</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TenderList;

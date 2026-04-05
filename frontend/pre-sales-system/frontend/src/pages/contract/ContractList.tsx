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
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { contractApi } from '../../services/api';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface Contract {
  id: string;
  contractNo: string;
  projectId: string;
  tenderId?: string;
  name: string;
  description?: string;
  contractValue: number;
  currency?: string;
  paymentTerms?: string;
  signDate?: string;
  startDate?: string;
  endDate?: string;
  contractPeriod?: string;
  status: string;
  approvalStatus: string;
  approvedBy?: string;
  approvedAt?: string;
  signedBy?: string;
  signedAt?: string;
  signingParty?: string;
  createdAt: string;
  project?: {
    id: string;
    name: string;
    customerName: string;
  };
  tender?: {
    id: string;
    tenderNo: string;
    name: string;
  };
}

const ContractList: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [currentContract, setCurrentContract] = useState<Contract | null>(null);
  const [editItem, setEditItem] = useState<Contract | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<any>({});
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const loadContracts = async (params: any = {}) => {
    try {
      setLoading(true);
      const response = await contractApi.getList({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
        ...params,
      });

      setContracts(response.data || []);
      setPagination({
        current: response.page || 1,
        pageSize: response.pageSize || 10,
        total: response.total || 0,
      });
    } catch (error) {
      console.error('加载合同列表失败:', error);
      message.error('加载合同列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const columns = [
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      key: 'contractNo',
      width: 150,
      fixed: 'left' as const,
    },
    {
      title: '合同名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Contract) => (
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
      title: '关联投标',
      dataIndex: 'tender',
      key: 'tender',
      width: 180,
      render: (tender: any) => (
        <Space direction="vertical" size={0}>
          <span>{tender?.name || '-'}</span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {tender?.tenderNo || '-'}
          </span>
        </Space>
      ),
    },
    {
      title: '合同金额',
      dataIndex: 'contractValue',
      key: 'contractValue',
      width: 150,
      render: (value: number) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>
          {value?.toLocaleString()}元
        </span>
      ),
    },
    {
      title: '签约日期',
      dataIndex: 'signDate',
      key: 'signDate',
      width: 120,
      render: (date: string | null) => (date ? date.split('T')[0] : '-'),
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date: string | null) => (date ? date.split('T')[0] : '-'),
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (date: string | null) => (date ? date.split('T')[0] : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          DRAFT: { text: '草稿', color: 'default' },
          UNDER_REVIEW: { text: '审核中', color: 'processing' },
          APPROVED: { text: '已批准', color: 'success' },
          SIGNED: { text: '已签约', color: 'success' },
          ACTIVE: { text: '执行中', color: 'blue' },
          COMPLETED: { text: '已完成', color: 'green' },
          TERMINATED: { text: '已终止', color: 'error' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 120,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          PENDING: { text: '待审批', color: 'warning' },
          APPROVED: { text: '已批准', color: 'success' },
          REJECTED: { text: '已拒绝', color: 'error' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
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
      render: (text: string, record: Contract) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个合同吗?"
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
    if (values.dateRange) {
      newFilters.startDate = values.dateRange[0]?.format('YYYY-MM-DD');
      newFilters.endDate = values.dateRange[1]?.format('YYYY-MM-DD');
    }

    setFilters(newFilters);
    setPagination({ ...pagination, current: 1 });
    loadContracts({ ...newFilters, page: 1 });
  };

  const handleReset = () => {
    setFilters({});
    setPagination({ ...pagination, current: 1 });
    loadContracts({ page: 1 });
  };

  const handleCreate = () => {
    setIsModalVisible(true);
  };

  const handleCreateOk = async () => {
    try {
      const values = await createForm.validateFields();
      setLoading(true);

      await contractApi.create(values);
      message.success('合同创建成功!');
      setIsModalVisible(false);
      createForm.resetFields();
      loadContracts();
    } catch (error: any) {
      console.error('创建合同失败:', error);
      message.error(error.response?.data?.message || '创建合同失败');
    } finally {
      setLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    createForm.resetFields();
  };

  const handleViewDetail = (contract: Contract) => {
    setCurrentContract(contract);
    setIsDetailModalVisible(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditItem(contract);
    editForm.setFieldsValue({
      ...contract,
      signDate: contract.signDate ? contract.signDate.split('T')[0] : null,
      startDate: contract.startDate ? contract.startDate.split('T')[0] : null,
      endDate: contract.endDate ? contract.endDate.split('T')[0] : null,
    });
    setIsEditModalVisible(true);
  };

  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);

      await contractApi.update(editItem!.id, values);
      message.success('合同更新成功!');
      setIsEditModalVisible(false);
      editForm.resetFields();
      setEditItem(null);
      loadContracts();
    } catch (error: any) {
      console.error('更新合同失败:', error);
      message.error(error.response?.data?.message || '更新合同失败');
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
      await contractApi.delete(id);
      message.success('合同删除成功');
      loadContracts();
    } catch (error: any) {
      console.error('删除合同失败:', error);
      message.error(error.response?.data?.message || '删除合同失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusCount = () => {
    return {
      draft: contracts.filter((c) => c.status === 'DRAFT').length,
      underReview: contracts.filter((c) => c.status === 'UNDER_REVIEW').length,
      approved: contracts.filter((c) => c.status === 'APPROVED').length,
      signed: contracts.filter((c) => c.status === 'SIGNED').length,
      active: contracts.filter((c) => c.status === 'ACTIVE').length,
      completed: contracts.filter((c) => c.status === 'COMPLETED').length,
      total: contracts.length,
      totalValue: contracts.reduce((sum, c) => sum + (c.contractValue || 0), 0),
    };
  };

  const statusCount = getStatusCount();

  return (
    <Card
      title="合同管理"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => loadContracts()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建合同
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
              title="合同总额"
              value={statusCount.totalValue}
              precision={0}
              prefix="¥"
              suffix="元"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="执行中"
              value={statusCount.active}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="已签约"
              value={statusCount.signed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="已完成"
              value={statusCount.completed}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic
              title="待审批"
              value={statusCount.underReview}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {/* 搜索栏 */}
        <Form layout="inline" onFinish={handleSearch} style={{ marginBottom: 16 }}>
          <Form.Item name="keyword">
            <Search
              placeholder="搜索合同名称/编号"
              allowClear
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 120 }}>
              <Option value="DRAFT">草稿</Option>
              <Option value="UNDER_REVIEW">审核中</Option>
              <Option value="APPROVED">已批准</Option>
              <Option value="SIGNED">已签约</Option>
              <Option value="ACTIVE">执行中</Option>
              <Option value="COMPLETED">已完成</Option>
              <Option value="TERMINATED">已终止</Option>
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
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Form.Item>
        </Form>

        {/* 合同表格 */}
        <Table
          columns={columns}
          dataSource={contracts}
          rowKey="id"
          scroll={{ x: 2200 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize: pageSize || 10 });
              loadContracts({ page });
            },
          }}
        />
      </Spin>

      {/* 创建合同弹窗 */}
      <Modal
        title="新建合同"
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
            label="合同名称"
            rules={[{ required: true, message: '请输入合同名称' }]}
          >
            <Input placeholder="请输入合同名称" />
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

          <Form.Item name="tenderId" label="关联投标">
            <Select placeholder="请选择投标(可选)">
              {/* 动态加载投标列表 */}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="合同描述">
            <Input.TextArea rows={4} placeholder="请输入合同描述" />
          </Form.Item>

          <Form.Item
            name="contractValue"
            label="合同金额"
            rules={[{ required: true, message: '请输入合同金额' }]}
          >
            <Input type="number" placeholder="请输入合同金额" />
          </Form.Item>

          <Form.Item name="paymentTerms" label="付款条件">
            <Input placeholder="请输入付款条件" />
          </Form.Item>

          <Form.Item name="signDate" label="签约日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="startDate" label="开始日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="endDate" label="结束日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="contractPeriod" label="合同周期">
            <Input placeholder="如:1年,2年等" />
          </Form.Item>

          <Form.Item name="signingParty" label="签约方">
            <Input placeholder="请输入签约方" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 合同详情弹窗 */}
      <Modal
        title="合同详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {currentContract && (
          <div>
            <h3 style={{ marginBottom: 16 }}>{currentContract.name}</h3>
            
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      ¥{currentContract.contractValue?.toLocaleString()}
                    </div>
                    <div style={{ color: '#8c8c8c' }}>合同金额</div>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                      {currentContract.signDate?.split('T')[0] || '-'}
                    </div>
                    <div style={{ color: '#8c8c8c' }}>签约日期</div>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                      {currentContract.contractPeriod || '-'}
                    </div>
                    <div style={{ color: '#8c8c8c' }}>合同周期</div>
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>基本信息</h4>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>合同编号:</span>
                    <span>{currentContract.contractNo}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>项目名称:</span>
                    <span>{currentContract.project?.name || '-'}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>客户名称:</span>
                    <span>{currentContract.project?.customerName || '-'}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>签约方:</span>
                    <span>{currentContract.signingParty || '-'}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>开始日期:</span>
                    <span>{currentContract.startDate?.split('T')[0] || '-'}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#8c8c8c', marginRight: 8 }}>结束日期:</span>
                    <span>{currentContract.endDate?.split('T')[0] || '-'}</span>
                  </div>
                </Col>
              </Row>
            </div>

            {currentContract.description && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 8 }}>合同描述</h4>
                <p style={{ color: '#595959', lineHeight: 1.8 }}>
                  {currentContract.description}
                </p>
              </div>
            )}

            {currentContract.paymentTerms && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ marginBottom: 8 }}>付款条件</h4>
                <p style={{ color: '#595959', lineHeight: 1.8 }}>
                  {currentContract.paymentTerms}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 编辑合同弹窗 */}
      <Modal
        title="编辑合同"
        open={isEditModalVisible}
        onOk={handleEditOk}
        onCancel={handleEditModalCancel}
        width={800}
        okText="确定"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item name="name" label="合同名称" rules={[{ required: true }]}>
            <Input placeholder="请输入合同名称" />
          </Form.Item>
          <Form.Item name="description" label="合同描述">
            <Input.TextArea rows={4} placeholder="请输入合同描述" />
          </Form.Item>
          <Form.Item name="contractValue" label="合同金额" rules={[{ required: true }]}>
            <Input type="number" placeholder="请输入合同金额" />
          </Form.Item>
          <Form.Item name="paymentTerms" label="付款条件">
            <Input placeholder="请输入付款条件" />
          </Form.Item>
          <Form.Item name="signDate" label="签约日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="startDate" label="开始日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endDate" label="结束日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="contractPeriod" label="合同周期">
            <Input placeholder="如:1年,2年等" />
          </Form.Item>
          <Form.Item name="signingParty" label="签约方">
            <Input placeholder="请输入签约方" />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select placeholder="请选择状态">
              <Option value="DRAFT">草稿</Option>
              <Option value="UNDER_REVIEW">审核中</Option>
              <Option value="APPROVED">已批准</Option>
              <Option value="SIGNED">已签约</Option>
              <Option value="ACTIVE">执行中</Option>
              <Option value="COMPLETED">已完成</Option>
              <Option value="TERMINATED">已终止</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ContractList;

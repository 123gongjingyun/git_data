import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Form,
  Modal,
  message,
  Tooltip,
  Spin,
  Popconfirm,
  Descriptions,
  Steps,
  Empty,
  Badge,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
  SendOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { solutionApi } from '../../services/api';

const { Search } = Input;
const { Step } = Steps;

interface Solution {
  id: string;
  solutionNo: string;
  name: string;
  projectId: string;
  project?: {
    id: string;
    name: string;
  };
  version: string;
  status: string;
  approvalStatus: string;
  summary?: string;
  architecture?: string;
  features?: string;
  benefits?: string;
  parentSolutionId?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  documents?: any[];
}

const SolutionList: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<any>({});
  const [form] = Form.useForm();
  const [approvalForm] = Form.useForm();

  // 加载方案列表
  const loadSolutions = async (params: any = {}) => {
    try {
      setLoading(true);
      const response = await solutionApi.getList({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
        ...params,
      });

      setSolutions(response.data || []);
      setPagination({
        current: response.page || 1,
        pageSize: response.pageSize || 10,
        total: response.total || 0,
      });
    } catch (error) {
      console.error('加载方案列表失败:', error);
      message.error('加载方案列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSolutions();
  }, []);

  const columns = [
    {
      title: '方案编号',
      dataIndex: 'solutionNo',
      key: 'solutionNo',
      width: 130,
      fixed: 'left' as const,
    },
    {
      title: '方案名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ellipsis: true,
      render: (text: string, record: Solution) => (
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
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (version: string) => <Tag color="blue">v{version}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
          DRAFT: { text: '草稿', color: 'default', icon: <FileTextOutlined /> },
          UNDER_REVIEW: { text: '审核中', color: 'processing', icon: <ClockCircleOutlined /> },
          APPROVED: { text: '已批准', color: 'success', icon: <CheckCircleOutlined /> },
          REJECTED: { text: '已拒绝', color: 'error', icon: <CloseCircleOutlined /> },
          ARCHIVED: { text: '已归档', color: 'default', icon: null },
        };
        const { text, color, icon } = statusMap[status] || { text: status, color: 'default', icon: null };
        return <Tag color={color} icon={icon}>{text}</Tag>;
      },
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          PENDING: { text: '待审批', color: 'orange' },
          APPROVED: { text: '已批准', color: 'success' },
          REJECTED: { text: '已拒绝', color: 'error' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Badge status={color === 'success' ? 'success' : color === 'error' ? 'error' : 'processing'} text={text} />;
      },
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => date.split('T')[0],
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => date.split('T')[0],
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right' as const,
      render: (text: string, record: Solution) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} disabled={record.status !== 'DRAFT'} />
          </Tooltip>
          {record.status === 'DRAFT' && (
            <Tooltip title="提交审批">
              <Button type="text" icon={<SendOutlined />} onClick={() => handleSubmitApproval(record)} />
            </Tooltip>
          )}
          {record.approvalStatus === 'PENDING' && (
            <Tooltip title="审批">
              <Button type="text" icon={<CheckCircleOutlined />} onClick={() => handleOpenApproval(record)} />
            </Tooltip>
          )}
          <Popconfirm
            title="确定要删除这个方案吗?"
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
    if (values.approvalStatus) newFilters.approvalStatus = values.approvalStatus;
    if (values.version) newFilters.version = values.version;

    setFilters(newFilters);
    setPagination({ ...pagination, current: 1 });
    loadSolutions({ ...newFilters, page: 1 });
  };

  const handleReset = () => {
    setFilters({});
    setPagination({ ...pagination, current: 1 });
    loadSolutions({ page: 1 });
  };

  const handleCreate = () => {
    setIsModalVisible(true);
  };

  const handleCreateOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await solutionApi.create(values);
      message.success('方案创建成功!');
      setIsModalVisible(false);
      form.resetFields();
      loadSolutions();
    } catch (error: any) {
      console.error('创建方案失败:', error);
      message.error(error.response?.data?.message || '创建方案失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (solution: Solution) => {
    setSelectedSolution(solution);
    setIsDetailVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await solutionApi.delete(id);
      message.success('方案删除成功');
      loadSolutions();
    } catch (error: any) {
      console.error('删除方案失败:', error);
      message.error(error.response?.data?.message || '删除方案失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApproval = async (solution: Solution) => {
    try {
      setLoading(true);
      await solutionApi.update(solution.id, { status: 'UNDER_REVIEW', approvalStatus: 'PENDING' });
      message.success('方案已提交审批');
      loadSolutions();
    } catch (error: any) {
      console.error('提交审批失败:', error);
      message.error(error.response?.data?.message || '提交审批失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproval = (solution: Solution) => {
    setSelectedSolution(solution);
    setIsApprovalModalVisible(true);
  };

  const handleApprove = async () => {
    try {
      const values = await approvalForm.validateFields();
      setLoading(true);

      await solutionApi.approve(selectedSolution!.id, {
        ...values,
        status: 'APPROVED',
        approvalStatus: 'APPROVED',
        approvedAt: new Date().toISOString(),
      });

      message.success('方案已批准');
      setIsApprovalModalVisible(false);
      approvalForm.resetFields();
      setSelectedSolution(null);
      loadSolutions();
    } catch (error: any) {
      console.error('审批失败:', error);
      message.error(error.response?.data?.message || '审批失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      const values = await approvalForm.validateFields();
      if (!values.rejectionReason) {
        message.error('请输入拒绝原因');
        return;
      }

      setLoading(true);

      await solutionApi.reject(selectedSolution!.id, {
        rejectionReason: values.rejectionReason,
        status: 'REJECTED',
        approvalStatus: 'REJECTED',
      });

      message.success('方案已拒绝');
      setIsApprovalModalVisible(false);
      approvalForm.resetFields();
      setSelectedSolution(null);
      loadSolutions();
    } catch (error: any) {
      console.error('拒绝失败:', error);
      message.error(error.response?.data?.message || '拒绝失败');
    } finally {
      setLoading(false);
    }
  };

  const underReviewCount = solutions.filter(s => s.status === 'UNDER_REVIEW').length;
  const approvedCount = solutions.filter(s => s.status === 'APPROVED').length;
  const draftCount = solutions.filter(s => s.status === 'DRAFT').length;

  return (
    <div>
      <Spin spinning={loading}>
        {/* 统计卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 16
        }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>方案总数</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {solutions.length}
                </div>
              </div>
              <FileTextOutlined style={{ fontSize: 32, color: '#1890ff' }} />
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>审核中</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>
                  {underReviewCount}
                </div>
              </div>
              <ClockCircleOutlined style={{ fontSize: 32, color: '#fa8c16' }} />
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>已批准</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {approvedCount}
                </div>
              </div>
              <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#8c8c8c', fontSize: 14, marginBottom: 8 }}>草稿</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#8c8c8c' }}>
                  {draftCount}
                </div>
              </div>
              <div style={{ fontSize: 24 }}>📝</div>
            </div>
          </Card>
        </div>

        {/* 方案列表 */}
        <Card
          title="解决方案管理"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建方案
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
                placeholder="搜索方案名称/项目名称"
                allowClear
                style={{ width: 250 }}
              />
            </Form.Item>
            <Form.Item name="status">
              <Select placeholder="状态" allowClear style={{ width: 120 }}>
                <Select.Option value="DRAFT">草稿</Select.Option>
                <Select.Option value="UNDER_REVIEW">审核中</Select.Option>
                <Select.Option value="APPROVED">已批准</Select.Option>
                <Select.Option value="REJECTED">已拒绝</Select.Option>
                <Select.Option value="ARCHIVED">已归档</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="approvalStatus">
              <Select placeholder="审批状态" allowClear style={{ width: 120 }}>
                <Select.Option value="PENDING">待审批</Select.Option>
                <Select.Option value="APPROVED">已批准</Select.Option>
                <Select.Option value="REJECTED">已拒绝</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="version">
              <Input placeholder="版本号" allowClear style={{ width: 120 }} />
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

          {/* 方案表格 */}
          <Table
            columns={columns}
            dataSource={solutions}
            rowKey="id"
            scroll={{ x: 1500 }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPagination({ ...pagination, current: page, pageSize: pageSize || 10 });
                loadSolutions({ page });
              },
            }}
          />
        </Card>
      </Spin>

      {/* 创建方案弹窗 */}
      <Modal
        title="新建解决方案"
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
            label="方案名称"
            rules={[{ required: true, message: '请输入方案名称' }]}
          >
            <Input placeholder="请输入方案名称" />
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

          <Form.Item name="version" label="版本号" initialValue="1.0">
            <Input placeholder="请输入版本号" />
          </Form.Item>

          <Form.Item name="summary" label="方案摘要">
            <Input.TextArea rows={3} placeholder="请输入方案摘要" />
          </Form.Item>

          <Form.Item name="architecture" label="技术架构">
            <Input.TextArea rows={5} placeholder="请描述技术架构" />
          </Form.Item>

          <Form.Item name="features" label="核心功能">
            <Input.TextArea rows={4} placeholder="请列出核心功能特性" />
          </Form.Item>

          <Form.Item name="benefits" label="方案价值">
            <Input.TextArea rows={4} placeholder="请描述方案带来的价值" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 方案详情弹窗 */}
      <Modal
        title="方案详情"
        open={isDetailVisible}
        onCancel={() => {
          setIsDetailVisible(false);
          setSelectedSolution(null);
        }}
        width={900}
        footer={[
          <Button key="close" onClick={() => setIsDetailVisible(false)}>
            关闭
          </Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />}>
            下载方案
          </Button>,
        ]}
      >
        {selectedSolution && (
          <div>
            {/* 审批流程 */}
            <Card style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>
                审批流程
              </div>
              <Steps
                current={
                  selectedSolution.approvalStatus === 'PENDING' ? 1 :
                  selectedSolution.approvalStatus === 'APPROVED' ? 2 :
                  selectedSolution.approvalStatus === 'REJECTED' ? 3 : 0
                }
                status={
                  selectedSolution.approvalStatus === 'REJECTED' ? 'error' :
                  selectedSolution.approvalStatus === 'APPROVED' ? 'finish' : 'process'
                }
              >
                <Step title="草稿" description="创建方案草稿" icon={<FileTextOutlined />} />
                <Step title="提交审批" description="提交审核" icon={<SendOutlined />} />
                <Step
                  title="审批完成"
                  description={selectedSolution.approvalStatus === 'APPROVED' ? '已批准' : '审批中'}
                  icon={<CheckCircleOutlined />}
                />
                {selectedSolution.approvalStatus === 'REJECTED' && (
                  <Step title="已拒绝" description={selectedSolution.rejectionReason} icon={<CloseCircleOutlined />} />
                )}
              </Steps>
            </Card>

            {/* 基本信息 */}
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="方案编号">{selectedSolution.solutionNo}</Descriptions.Item>
                <Descriptions.Item label="方案名称">{selectedSolution.name}</Descriptions.Item>
                <Descriptions.Item label="关联项目">{selectedSolution.project?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="版本">v{selectedSolution.version}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={
                    selectedSolution.status === 'APPROVED' ? 'success' :
                    selectedSolution.status === 'UNDER_REVIEW' ? 'processing' :
                    selectedSolution.status === 'REJECTED' ? 'error' : 'default'
                  }>
                    {selectedSolution.status === 'DRAFT' ? '草稿' :
                     selectedSolution.status === 'UNDER_REVIEW' ? '审核中' :
                     selectedSolution.status === 'APPROVED' ? '已批准' :
                     selectedSolution.status === 'REJECTED' ? '已拒绝' : '已归档'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="审批状态">
                  <Tag color={
                    selectedSolution.approvalStatus === 'APPROVED' ? 'success' :
                    selectedSolution.approvalStatus === 'REJECTED' ? 'error' : 'orange'
                  }>
                    {selectedSolution.approvalStatus === 'PENDING' ? '待审批' :
                     selectedSolution.approvalStatus === 'APPROVED' ? '已批准' : '已拒绝'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">{selectedSolution.createdAt.split('T')[0]}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{selectedSolution.updatedAt.split('T')[0]}</Descriptions.Item>
                {selectedSolution.approvedAt && (
                  <Descriptions.Item label="审批时间" span={2}>{selectedSolution.approvedAt.split('T')[0]}</Descriptions.Item>
                )}
                {selectedSolution.rejectionReason && (
                  <Descriptions.Item label="拒绝原因" span={2}>
                    <span style={{ color: '#ff4d4f' }}>{selectedSolution.rejectionReason}</span>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* 方案内容 */}
            {selectedSolution.summary && (
              <Card title="方案摘要" style={{ marginBottom: 16 }}>
                <p style={{ lineHeight: 1.8, color: '#595959' }}>{selectedSolution.summary}</p>
              </Card>
            )}

            {selectedSolution.architecture && (
              <Card title="技术架构" style={{ marginBottom: 16 }}>
                <p style={{ lineHeight: 1.8, color: '#595959', whiteSpace: 'pre-wrap' }}>
                  {selectedSolution.architecture}
                </p>
              </Card>
            )}

            {selectedSolution.features && (
              <Card title="核心功能" style={{ marginBottom: 16 }}>
                <p style={{ lineHeight: 1.8, color: '#595959', whiteSpace: 'pre-wrap' }}>
                  {selectedSolution.features}
                </p>
              </Card>
            )}

            {selectedSolution.benefits && (
              <Card title="方案价值" style={{ marginBottom: 16 }}>
                <p style={{ lineHeight: 1.8, color: '#595959', whiteSpace: 'pre-wrap' }}>
                  {selectedSolution.benefits}
                </p>
              </Card>
            )}

            {/* 方案文档 */}
            <Card title="方案文档">
              {selectedSolution.documents && selectedSolution.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedSolution.documents.map((doc: any) => (
                    <div key={doc.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 12,
                      background: '#f5f5f5',
                      borderRadius: 4
                    }}>
                      <Space>
                        <FileTextOutlined style={{ color: '#1890ff' }} />
                        <span>{doc.fileName}</span>
                      </Space>
                      <Space>
                        <Button type="link" icon={<DownloadOutlined />}>下载</Button>
                        <Button type="link" danger>删除</Button>
                      </Space>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="暂无上传文档" />
              )}
            </Card>
          </div>
        )}
      </Modal>

      {/* 审批弹窗 */}
      <Modal
        title="方案审批"
        open={isApprovalModalVisible}
        onCancel={() => {
          setIsApprovalModalVisible(false);
          approvalForm.resetFields();
          setSelectedSolution(null);
        }}
        width={700}
        footer={[
          <Button key="reject" danger onClick={handleReject} loading={loading}>
            拒绝
          </Button>,
          <Button key="approve" type="primary" onClick={handleApprove} loading={loading}>
            批准
          </Button>,
        ]}
      >
        {selectedSolution && (
          <div>
            <Descriptions bordered column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="方案名称">{selectedSolution.name}</Descriptions.Item>
              <Descriptions.Item label="方案编号">{selectedSolution.solutionNo}</Descriptions.Item>
              <Descriptions.Item label="关联项目">{selectedSolution.project?.name}</Descriptions.Item>
              <Descriptions.Item label="版本">v{selectedSolution.version}</Descriptions.Item>
            </Descriptions>

            {selectedSolution.summary && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>方案摘要</div>
                <p style={{ color: '#595959', lineHeight: 1.8 }}>{selectedSolution.summary}</p>
              </div>
            )}

            <Form form={approvalForm} layout="vertical">
              <Form.Item name="approvalComments" label="审批意见">
                <Input.TextArea
                  rows={4}
                  placeholder="请输入审批意见"
                  value={selectedSolution.rejectionReason || ''}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SolutionList;

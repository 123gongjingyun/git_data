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
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectApi } from '../../services/api';

const { Search } = Input;
const { RangePicker } = DatePicker;

interface Project {
  id: string;
  projectNo: string;
  name: string;
  customerName: string;
  status: string;
  currentStage: string;
  priority: string;
  budget: number | null;
  expectedValue: number | null;
  expectedCloseDate: string | null;
  createdAt: string;
  assignee?: {
    id: string;
    username: string;
    realName: string;
  } | null;
  _count?: {
    opportunities: number;
    activities: number;
  };
}

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState<any>({});
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载项目列表
  const loadProjects = async (params: any = {}) => {
    try {
      setLoading(true);
      const response = await projectApi.getList({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
        ...params,
      });

      setProjects(response.data || []);
      setPagination({
        current: response.page || 1,
        pageSize: response.pageSize || 10,
        total: response.total || 0,
      });
    } catch (error) {
      console.error('加载项目列表失败:', error);
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const columns = [
    {
      title: '项目编号',
      dataIndex: 'projectNo',
      key: 'projectNo',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Project) => (
        <a onClick={() => navigate(`/projects/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
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
          IN_PROGRESS: { text: '进行中', color: 'processing' },
          WON: { text: '赢单', color: 'success' },
          LOST: { text: '输单', color: 'error' },
          CANCELLED: { text: '取消', color: 'default' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '阶段',
      dataIndex: 'currentStage',
      key: 'currentStage',
      width: 100,
      render: (stage: string) => {
        const stageMap: Record<string, string> = {
          DISCOVERY: '发现',
          ANALYSIS: '分析',
          PROPOSAL: '提案',
          NEGOTIATION: '谈判',
          CLOSING: '成交',
        };
        return stageMap[stage] || stage;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const priorityMap: Record<string, { text: string; color: string }> = {
          URGENT: { text: '紧急', color: 'red' },
          HIGH: { text: '高', color: 'orange' },
          MEDIUM: { text: '中', color: 'blue' },
          LOW: { text: '低', color: 'default' },
        };
        const { text, color } = priorityMap[priority] || { text: priority, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '预算(万)',
      dataIndex: 'budget',
      key: 'budget',
      width: 120,
      render: (value: number | null) => (value ? `¥${(value / 10000).toFixed(0)}` : '-'),
    },
    {
      title: '预期价值(万)',
      dataIndex: 'expectedValue',
      key: 'expectedValue',
      width: 120,
      render: (value: number | null) => (value ? `¥${(value / 10000).toFixed(0)}` : '-'),
    },
    {
      title: '商机数',
      dataIndex: '_count',
      key: 'opportunitiesCount',
      width: 80,
      render: (count: any) => count?.opportunities || 0,
    },
    {
      title: '预计关闭日期',
      dataIndex: 'expectedCloseDate',
      key: 'expectedCloseDate',
      width: 130,
      render: (date: string | null) => (date ? date.split('T')[0] : '-'),
    },
    {
      title: '负责人',
      dataIndex: 'assignee',
      key: 'assignedTo',
      width: 100,
      render: (assignee: any) => assignee?.realName || '-',
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
      render: (text: string, record: Project) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/projects/${record.id}`)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个项目吗?"
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
    if (values.stage) newFilters.currentStage = values.stage;
    if (values.priority) newFilters.priority = values.priority;
    if (values.dateRange) {
      newFilters.startDate = values.dateRange[0]?.format('YYYY-MM-DD');
      newFilters.endDate = values.dateRange[1]?.format('YYYY-MM-DD');
    }

    setFilters(newFilters);
    setPagination({ ...pagination, current: 1 });
    loadProjects({ ...newFilters, page: 1 });
  };

  const handleReset = () => {
    const form = document.querySelector('form');
    form?.reset();
    setFilters({});
    setPagination({ ...pagination, current: 1 });
    loadProjects({ page: 1 });
  };

  const handleCreate = () => {
    setIsModalVisible(true);
  };

  const handleCreateOk = async () => {
    try {
      const values = await createForm.validateFields();
      setLoading(true);

      await projectApi.create(values);
      message.success('项目创建成功!');
      setIsModalVisible(false);
      createForm.resetFields();
      loadProjects();
    } catch (error: any) {
      console.error('创建项目失败:', error);
      message.error(error.response?.data?.message || '创建项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project: Project) => {
    setCurrentProject(project);
    editForm.setFieldsValue({
      ...project,
      expectedCloseDate: project.expectedCloseDate ? project.expectedCloseDate.split('T')[0] : null,
    });
    setIsEditModalVisible(true);
  };

  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);

      await projectApi.update(currentProject!.id, values);
      message.success('项目更新成功!');
      setIsEditModalVisible(false);
      editForm.resetFields();
      setCurrentProject(null);
      loadProjects();
    } catch (error: any) {
      console.error('更新项目失败:', error);
      message.error(error.response?.data?.message || '更新项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await projectApi.delete(id);
      message.success('项目删除成功');
      loadProjects();
    } catch (error: any) {
      console.error('删除项目失败:', error);
      message.error(error.response?.data?.message || '删除项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    createForm.resetFields();
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
    setCurrentProject(null);
  };

  return (
    <Card
      title="项目管理"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => loadProjects()}>
            刷新
          </Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={handleCreate}>
            新建项目
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {/* 搜索栏 */}
        <Form
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="keyword">
            <Search
              placeholder="搜索项目名称/客户名称"
              allowClear
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 120 }}>
              <Select.Option value="LEAD">线索</Select.Option>
              <Select.Option value="QUALIFIED">合格</Select.Option>
              <Select.Option value="IN_PROGRESS">进行中</Select.Option>
              <Select.Option value="WON">赢单</Select.Option>
              <Select.Option value="LOST">输单</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="stage">
            <Select placeholder="阶段" allowClear style={{ width: 120 }}>
              <Select.Option value="DISCOVERY">发现</Select.Option>
              <Select.Option value="ANALYSIS">分析</Select.Option>
              <Select.Option value="PROPOSAL">提案</Select.Option>
              <Select.Option value="NEGOTIATION">谈判</Select.Option>
              <Select.Option value="CLOSING">成交</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="priority">
            <Select placeholder="优先级" allowClear style={{ width: 120 }}>
              <Select.Option value="URGENT">紧急</Select.Option>
              <Select.Option value="HIGH">高</Select.Option>
              <Select.Option value="MEDIUM">中</Select.Option>
              <Select.Option value="LOW">低</Select.Option>
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
            <Button icon={<FilterOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Form.Item>
        </Form>

        {/* 项目表格 */}
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          scroll={{ x: 1800 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize: pageSize || 10 });
              loadProjects({ page });
            },
          }}
        />
      </Spin>

      {/* 创建项目弹窗 */}
      <Modal
        title="新建项目"
        open={isModalVisible}
        onOk={handleCreateOk}
        onCancel={handleModalCancel}
        width={800}
        okText="确定"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form
          form={createForm}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>

          <Form.Item
            name="customerName"
            label="客户名称"
            rules={[{ required: true, message: '请输入客户名称' }]}
          >
            <Input placeholder="请输入客户名称" />
          </Form.Item>

          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={4} placeholder="请输入项目描述" />
          </Form.Item>

          <Form.Item name="budget" label="项目预算">
            <Input type="number" placeholder="请输入项目预算" />
          </Form.Item>

          <Form.Item name="expectedCloseDate" label="预计关闭日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="priority" label="优先级" initialValue="MEDIUM">
            <Select>
              <Select.Option value="URGENT">紧急</Select.Option>
              <Select.Option value="HIGH">高</Select.Option>
              <Select.Option value="MEDIUM">中</Select.Option>
              <Select.Option value="LOW">低</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑项目弹窗 */}
      <Modal
        title="编辑项目"
        open={isEditModalVisible}
        onOk={handleEditOk}
        onCancel={handleEditModalCancel}
        width={800}
        okText="确定"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form
          form={editForm}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="请输入项目名称" />
          </Form.Item>

          <Form.Item name="customerName" label="客户名称" rules={[{ required: true }]}>
            <Input placeholder="请输入客户名称" />
          </Form.Item>

          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={4} placeholder="请输入项目描述" />
          </Form.Item>

          <Form.Item name="budget" label="项目预算">
            <Input type="number" placeholder="请输入项目预算" />
          </Form.Item>

          <Form.Item name="expectedValue" label="预期价值">
            <Input type="number" placeholder="请输入预期价值" />
          </Form.Item>

          <Form.Item name="expectedCloseDate" label="预计关闭日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态">
              <Select.Option value="LEAD">线索</Select.Option>
              <Select.Option value="QUALIFIED">合格</Select.Option>
              <Select.Option value="IN_PROGRESS">进行中</Select.Option>
              <Select.Option value="WON">赢单</Select.Option>
              <Select.Option value="LOST">输单</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="currentStage" label="当前阶段">
            <Select placeholder="请选择阶段">
              <Select.Option value="DISCOVERY">发现</Select.Option>
              <Select.Option value="ANALYSIS">分析</Select.Option>
              <Select.Option value="PROPOSAL">提案</Select.Option>
              <Select.Option value="NEGOTIATION">谈判</Select.Option>
              <Select.Option value="CLOSING">成交</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="优先级">
            <Select placeholder="请选择优先级">
              <Select.Option value="URGENT">紧急</Select.Option>
              <Select.Option value="HIGH">高</Select.Option>
              <Select.Option value="MEDIUM">中</Select.Option>
              <Select.Option value="LOW">低</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ProjectList;

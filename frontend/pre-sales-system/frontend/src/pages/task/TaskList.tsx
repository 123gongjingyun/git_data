import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Progress,
  Row,
  Col,
  Statistic,
  DatePicker,
  Tooltip,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface Task {
  id: string;
  taskNo: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  progress: number;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  assignee?: {
    id: string;
    username: string;
    realName: string;
  };
  project?: {
    id: string;
    projectNo: string;
    name: string;
  };
  team?: {
    id: string;
    teamNo: string;
    name: string;
  };
}

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [myTasks, setMyTasks] = useState(false);
  const [summary, setSummary] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    highPriorityTasks: 0,
  });
  const [filters, setFilters] = useState({
    status: undefined,
    priority: undefined,
  });
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTasks();
    fetchSummary();
  }, [myTasks, filters]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = myTasks ? '/api/tasks/my' : '/api/tasks';
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (myTasks) params.append('assignedTo', '1'); // 模拟当前用户ID

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();
      setTasks(data.data || data);
    } catch (error) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/tasks/statistics/summary');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('获取统计数据失败', error);
    }
  };

  const handleAdd = () => {
    setEditingTask(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignee?.id,
      projectId: task.project?.id,
      teamId: task.team?.id,
      startDate: task.startDate ? dayjs(task.startDate) : null,
      dueDate: task.dueDate ? dayjs(task.dueDate) : null,
      estimatedHours: task.estimatedHours,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      message.success('任务删除成功');
      fetchTasks();
      fetchSummary();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
      };

      if (editingTask) {
        await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
        message.success('任务更新成功');
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        });
        message.success('任务创建成功');
      }
      setModalVisible(false);
      fetchTasks();
      fetchSummary();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}/complete`, { method: 'PATCH' });
      message.success('任务已标记为完成');
      fetchTasks();
      fetchSummary();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<Task> = [
    {
      title: '任务编号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 140,
    },
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          PENDING: { text: '待处理', color: 'default' },
          IN_PROGRESS: { text: '进行中', color: 'processing' },
          COMPLETED: { text: '已完成', color: 'success' },
          CANCELLED: { text: '已取消', color: 'default' },
          BLOCKED: { text: '已阻塞', color: 'error' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const priorityMap: Record<string, { text: string; color: string }> = {
          LOW: { text: '低', color: 'default' },
          MEDIUM: { text: '中', color: 'blue' },
          HIGH: { text: '高', color: 'orange' },
          URGENT: { text: '紧急', color: 'red' },
        };
        const { text, color } = priorityMap[priority] || { text: priority, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number) => (
        <Progress percent={progress} size="small" status={progress === 100 ? 'success' : 'normal'} />
      ),
    },
    {
      title: '执行人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 100,
      render: (assignee: Task['assignee']) =>
        assignee ? assignee.realName || assignee.username : '-',
    },
    {
      title: '项目',
      dataIndex: 'project',
      key: 'project',
      width: 120,
      render: (project: Task['project']) => project?.name || '-',
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => date || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status !== 'COMPLETED' && (
            <Tooltip title="完成任务">
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleComplete(record.id)}
              >
                完成
              </Button>
            </Tooltip>
          )}
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除此任务？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic
              title="任务总数"
              value={summary.totalTasks}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic
              title="待处理"
              value={summary.pendingTasks}
              valueStyle={{ color: '#8c8c8c' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic
              title="进行中"
              value={summary.inProgressTasks}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic
              title="已完成"
              value={summary.completedTasks}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic
              title="高优先级"
              value={summary.highPriorityTasks}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic
              title="逾期任务"
              value={0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={myTasks ? '我的任务' : '任务管理'}
        extra={
          <Space>
            <Button
              type={myTasks ? 'primary' : 'default'}
              onClick={() => setMyTasks(!myTasks)}
            >
              {myTasks ? '全部任务' : '我的任务'}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新建任务
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          >
            <Select.Option value="PENDING">待处理</Select.Option>
            <Select.Option value="IN_PROGRESS">进行中</Select.Option>
            <Select.Option value="COMPLETED">已完成</Select.Option>
            <Select.Option value="CANCELLED">已取消</Select.Option>
            <Select.Option value="BLOCKED">已阻塞</Select.Option>
          </Select>
          <Select
            placeholder="优先级筛选"
            allowClear
            style={{ width: 120 }}
            value={filters.priority}
            onChange={(value) => setFilters({ ...filters, priority: value })}
          >
            <Select.Option value="LOW">低</Select.Option>
            <Select.Option value="MEDIUM">中</Select.Option>
            <Select.Option value="HIGH">高</Select.Option>
            <Select.Option value="URGENT">紧急</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={tasks}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingTask ? '编辑任务' : '新建任务'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="任务标题"
                name="title"
                rules={[{ required: true, message: '请输入任务标题' }]}
              >
                <Input placeholder="请输入任务标题" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="任务描述" name="description">
                <TextArea rows={3} placeholder="请输入任务描述" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="status" initialValue="PENDING">
                <Select>
                  <Select.Option value="PENDING">待处理</Select.Option>
                  <Select.Option value="IN_PROGRESS">进行中</Select.Option>
                  <Select.Option value="COMPLETED">已完成</Select.Option>
                  <Select.Option value="CANCELLED">已取消</Select.Option>
                  <Select.Option value="BLOCKED">已阻塞</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority" initialValue="MEDIUM">
                <Select>
                  <Select.Option value="LOW">低</Select.Option>
                  <Select.Option value="MEDIUM">中</Select.Option>
                  <Select.Option value="HIGH">高</Select.Option>
                  <Select.Option value="URGENT">紧急</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="执行人" name="assignedTo">
                <Select placeholder="请选择执行人" allowClear>
                  <Select.Option value="1">张三</Select.Option>
                  <Select.Option value="2">李四</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="关联项目" name="projectId">
                <Select placeholder="请选择项目" allowClear>
                  <Select.Option value="1">项目A</Select.Option>
                  <Select.Option value="2">项目B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="所属团队" name="teamId">
                <Select placeholder="请选择团队" allowClear>
                  <Select.Option value="1">团队A</Select.Option>
                  <Select.Option value="2">团队B</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="预估工时" name="estimatedHours">
                <Input type="number" placeholder="请输入预估工时" suffix="小时" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="开始日期" name="startDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="截止日期" name="dueDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskList;

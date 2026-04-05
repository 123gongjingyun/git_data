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
  Row,
  Col,
  Statistic,
  Avatar,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;

interface Team {
  id: string;
  teamNo: string;
  name: string;
  description: string;
  department: string;
  status: string;
  memberCount: number;
  leader: {
    id: string;
    username: string;
    realName: string;
    email: string;
  };
  _count: {
    members: number;
    tasks: number;
  };
}

const TeamList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [statistics, setStatistics] = useState({
    totalTeams: 0,
    totalMembers: 0,
    totalTasks: 0,
    activeTeams: 0,
  });
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTeams();
    fetchStatistics();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/teams');
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      message.error('获取团队列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/teams/statistics/workload');
      const data = await response.json();
      setStatistics({
        totalTeams: data.members?.length || 0,
        totalMembers: data.totalMembers || 0,
        totalTasks: data.totalTasks || 0,
        activeTeams: data.activeMembers || 0,
      });
    } catch (error) {
      console.error('获取统计数据失败', error);
    }
  };

  const handleAdd = () => {
    setEditingTeam(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    form.setFieldsValue({
      name: team.name,
      description: team.description,
      department: team.department,
      status: team.status,
      leaderId: team.leader.id,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      message.success('团队删除成功');
      fetchTeams();
      fetchStatistics();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingTeam) {
        await fetch(`/api/teams/${editingTeam.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        message.success('团队更新成功');
      } else {
        await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        message.success('团队创建成功');
      }
      setModalVisible(false);
      fetchTeams();
      fetchStatistics();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleViewMembers = (team: Team) => {
    setSelectedTeam(team);
    setMembersModalVisible(true);
  };

  const columns: ColumnsType<Team> = [
    {
      title: '团队编号',
      dataIndex: 'teamNo',
      key: 'teamNo',
      width: 120,
    },
    {
      title: '团队名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      render: (text: string) => text || '-',
    },
    {
      title: '负责人',
      dataIndex: 'leader',
      key: 'leader',
      render: (leader: Team['leader']) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <span>{leader.realName || leader.username}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          ACTIVE: { text: '活跃', color: 'success' },
          INACTIVE: { text: '停用', color: 'default' },
          ARCHIVED: { text: '已归档', color: 'default' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '成员数',
      dataIndex: '_count',
      key: 'members',
      width: 80,
      render: (count: any) => (
        <Tag icon={<UserOutlined />} color="blue">
          {count.members}
        </Tag>
      ),
    },
    {
      title: '任务数',
      dataIndex: '_count',
      key: 'tasks',
      width: 80,
      render: (count: any) => (
        <Tag icon={<ProjectOutlined />} color="green">
          {count.tasks}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看成员">
            <Button type="link" size="small" icon={<TeamOutlined />} onClick={() => handleViewMembers(record)}>
              成员
            </Button>
          </Tooltip>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除此团队？" onConfirm={() => handleDelete(record.id)}>
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
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="团队总数"
              value={statistics.totalTeams}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成员总数"
              value={statistics.totalMembers}
              prefix={<UserOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="任务总数"
              value={statistics.totalTasks}
              prefix={<ProjectOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃团队"
              value={statistics.activeTeams}
              prefix={<TeamOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="团队管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建团队
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={teams}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingTeam ? '编辑团队' : '新建团队'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="团队名称"
            name="name"
            rules={[{ required: true, message: '请输入团队名称' }]}
          >
            <Input placeholder="请输入团队名称" />
          </Form.Item>
          <Form.Item label="团队描述" name="description">
            <TextArea rows={3} placeholder="请输入团队描述" />
          </Form.Item>
          <Form.Item label="所属部门" name="department">
            <Input placeholder="请输入所属部门" />
          </Form.Item>
          <Form.Item
            label="负责人"
            name="leaderId"
            rules={[{ required: true, message: '请选择负责人' }]}
          >
            <Select placeholder="请选择负责人">
              <Select.Option value="1">张三</Select.Option>
              <Select.Option value="2">李四</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">活跃</Select.Option>
              <Select.Option value="INACTIVE">停用</Select.Option>
              <Select.Option value="ARCHIVED">已归档</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`团队成员 - ${selectedTeam?.name}`}
        open={membersModalVisible}
        onCancel={() => setMembersModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
          成员列表功能开发中...
        </div>
      </Modal>
    </div>
  );
};

export default TeamList;

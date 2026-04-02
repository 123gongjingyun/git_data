import React from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Select,
  Button,
  message,
  Tabs,
  Avatar,
  Upload,
  Space,
  Divider,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  SettingOutlined,
  UploadOutlined,
  SaveOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';

const { Option } = Select;
const { TabPane } = Tabs;

const Settings: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [passwordVisible, setPasswordVisible] = React.useState({
    old: false,
    new: false,
    confirm: false,
  });

  const handleProfileSubmit = async (values: any) => {
    try {
      setLoading(true);
      // 实际项目中应调用API
      console.log('保存个人信息:', values);
      message.success('个人信息保存成功');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (values: any) => {
    try {
      setLoading(true);
      // 实际项目中应调用API
      console.log('修改密码:', values);
      message.success('密码修改成功');
    } catch (error) {
      message.error('密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSubmit = async (values: any) => {
    try {
      setLoading(true);
      // 实际项目中应调用API
      console.log('保存通知设置:', values);
      message.success('通知设置保存成功');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSubmit = async (values: any) => {
    try {
      setLoading(true);
      // 实际项目中应调用API
      console.log('保存系统设置:', values);
      message.success('系统设置保存成功');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card title="系统设置" style={{ marginBottom: 16 }}>
        <Tabs defaultActiveKey="profile">
          <TabPane tab={<span><UserOutlined /> 个人信息</span>} key="profile">
            <Card title="基本资料" style={{ marginTop: 16 }}>
              <Form
                layout="vertical"
                initialValues={{
                  username: 'admin',
                  email: 'admin@example.com',
                  realName: '管理员',
                  phone: '13800138000',
                  department: '技术部',
                  position: '系统管理员',
                }}
                onFinish={handleProfileSubmit}
              >
                <Form.Item label="头像">
                  <Space direction="vertical" align="start">
                    <Avatar size={80} icon={<UserOutlined />} />
                    <Upload>
                      <Button icon={<UploadOutlined />}>更换头像</Button>
                    </Upload>
                  </Space>
                </Form.Item>

                <Form.Item
                  label="用户名"
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input placeholder="请输入用户名" />
                </Form.Item>

                <Form.Item
                  label="真实姓名"
                  name="realName"
                  rules={[{ required: true, message: '请输入真实姓名' }]}
                >
                  <Input placeholder="请输入真实姓名" />
                </Form.Item>

                <Form.Item
                  label="邮箱"
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '请输入有效的邮箱地址' },
                  ]}
                >
                  <Input placeholder="请输入邮箱" />
                </Form.Item>

                <Form.Item label="手机号" name="phone">
                  <Input placeholder="请输入手机号" />
                </Form.Item>

                <Form.Item label="部门" name="department">
                  <Select placeholder="请选择部门">
                    <Option value="技术部">技术部</Option>
                    <Option value="销售部">销售部</Option>
                    <Option value="市场部">市场部</Option>
                    <Option value="运营部">运营部</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="职位" name="position">
                  <Select placeholder="请选择职位">
                    <Option value="普通员工">普通员工</Option>
                    <Option value="部门经理">部门经理</Option>
                    <Option value="销售经理">销售经理</Option>
                    <Option value="系统管理员">系统管理员</Option>
                  </Select>
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    保存
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane tab={<span><LockOutlined /> 修改密码</span>} key="password">
            <Card title="密码设置" style={{ marginTop: 16 }}>
              <Form layout="vertical" onFinish={handlePasswordSubmit}>
                <Form.Item
                  label="旧密码"
                  name="oldPassword"
                  rules={[{ required: true, message: '请输入旧密码' }]}
                >
                  <Input.Password
                    placeholder="请输入旧密码"
                    iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                    visible={passwordVisible.old}
                    onVisibleChange={(visible) => setPasswordVisible({ ...passwordVisible, old: visible })}
                  />
                </Form.Item>

                <Form.Item
                  label="新密码"
                  name="newPassword"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码长度至少6位' },
                  ]}
                >
                  <Input.Password
                    placeholder="请输入新密码"
                    iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                    visible={passwordVisible.new}
                    onVisibleChange={(visible) => setPasswordVisible({ ...passwordVisible, new: visible })}
                  />
                </Form.Item>

                <Form.Item
                  label="确认密码"
                  name="confirmPassword"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '请再次输入新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) => {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    placeholder="请再次输入新密码"
                    iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                    visible={passwordVisible.confirm}
                    onVisibleChange={(visible) => setPasswordVisible({ ...passwordVisible, confirm: visible })}
                  />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane tab={<span><BellOutlined /> 通知设置</span>} key="notification">
            <Card title="通知偏好" style={{ marginTop: 16 }}>
              <Form
                layout="vertical"
                initialValues={{
                  emailNotification: true,
                  browserNotification: true,
                  projectAssigned: true,
                  opportunityCreated: true,
                  solutionApproved: true,
                  contractSigned: true,
                  tenderExpiring: true,
                  weeklyReport: false,
                  monthlyReport: true,
                }}
                onFinish={handleNotificationSubmit}
              >
                <Divider orientation="left">通知方式</Divider>

                <Form.Item
                  label="邮件通知"
                  name="emailNotification"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label="浏览器通知"
                  name="browserNotification"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Divider orientation="left">通知类型</Divider>

                <Form.Item
                  label="项目分配通知"
                  name="projectAssigned"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label="商机创建通知"
                  name="opportunityCreated"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label="方案审批通知"
                  name="solutionApproved"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label="合同签约通知"
                  name="contractSigned"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label="投标到期提醒"
                  name="tenderExpiring"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Divider orientation="left">报表通知</Divider>

                <Form.Item
                  label="周报推送"
                  name="weeklyReport"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label="月报推送"
                  name="monthlyReport"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    保存设置
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          <TabPane tab={<span><SettingOutlined /> 系统设置</span>} key="system">
            <Card title="通用设置" style={{ marginTop: 16 }}>
              <Form
                layout="vertical"
                initialValues={{
                  language: 'zh-CN',
                  theme: 'light',
                  pageSize: 10,
                  dateFormat: 'YYYY-MM-DD',
                  timeFormat: 'HH:mm:ss',
                  autoRefresh: false,
                  refreshInterval: 30,
                }}
                onFinish={handleSystemSubmit}
              >
                <Form.Item label="语言" name="language">
                  <Select>
                    <Option value="zh-CN">简体中文</Option>
                    <Option value="zh-TW">繁體中文</Option>
                    <Option value="en-US">English</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="主题" name="theme">
                  <Select>
                    <Option value="light">浅色主题</Option>
                    <Option value="dark">深色主题</Option>
                    <Option value="auto">跟随系统</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="默认每页显示数量" name="pageSize">
                  <Select>
                    <Option value={10}>10条</Option>
                    <Option value={20}>20条</Option>
                    <Option value={50}>50条</Option>
                    <Option value={100}>100条</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="日期格式" name="dateFormat">
                  <Select>
                    <Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
                    <Option value="YYYY/MM/DD">YYYY/MM/DD</Option>
                    <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="时间格式" name="timeFormat">
                  <Select>
                    <Option value="HH:mm:ss">24小时制</Option>
                    <Option value="hh:mm:ss">12小时制</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="自动刷新数据"
                  name="autoRefresh"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item label="刷新间隔(秒)" name="refreshInterval">
                  <Input type="number" min={10} max={300} />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    保存设置
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Settings;

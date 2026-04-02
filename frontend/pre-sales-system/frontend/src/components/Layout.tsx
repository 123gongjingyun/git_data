import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Button, Space, Badge } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  ProjectOutlined,
  BulbOutlined,
  SolutionOutlined,
  FileTextOutlined,
  FileProtectOutlined,
  BookOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '工作台',
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: '项目管理',
    },
    {
      key: '/opportunities',
      icon: <BulbOutlined />,
      label: '商机管理',
    },
    {
      key: '/solutions',
      icon: <SolutionOutlined />,
      label: '解决方案',
    },
    {
      key: '/tenders',
      icon: <FileTextOutlined />,
      label: '投标管理',
    },
    {
      key: '/contracts',
      icon: <FileProtectOutlined />,
      label: '合同管理',
    },
    {
      key: '/teams',
      icon: <TeamOutlined />,
      label: '团队协作',
    },
    {
      key: '/tasks',
      icon: <CheckCircleOutlined />,
      label: '任务管理',
    },
    {
      key: '/knowledge',
      icon: <BookOutlined />,
      label: '知识库',
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // 处理退出登录
      console.log('退出登录');
    } else if (key === 'profile' || key === 'settings') {
      navigate(key);
    }
  };

  const getCurrentPageTitle = () => {
    const menuItem = menuItems.find(item => item.key === location.pathname);
    return menuItem?.label || '售前管理系统';
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={240}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? '18px' : '20px',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {collapsed ? '售前' : '售前管理系统'}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      {/* 主内容区 */}
      <AntLayout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        {/* 顶部导航栏 */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            position: 'fixed',
            top: 0,
            right: 0,
            left: collapsed ? 80 : 240,
            zIndex: 1,
            transition: 'left 0.2s'
          }}
        >
          <Space size="large">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <span style={{ fontSize: 16, fontWeight: 500 }}>
              {getCurrentPageTitle()}
            </span>
          </Space>

          <Space size="large">
            <Badge count={5} size="small">
              <Button type="text" icon={<BellOutlined />} />
            </Badge>
            
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleMenuClick
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>解决方案工程师</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 页面内容 */}
        <Content
          style={{
            marginTop: 64,
            padding: '24px',
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;

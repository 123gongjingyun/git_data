import React, { useState, useEffect } from 'react';
import {
  Badge,
  Dropdown,
  List,
  Button,
  Avatar,
  Tag,
  Space,
  Empty,
  Spin,
  Tooltip,
  Popover,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { message } from 'antd';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationCenterProps {
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNotificationClick }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  // 模拟通知数据
  useEffect(() => {
    // 实际项目中应从API获取
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'success',
        title: '合同审批通过',
        content: '您提交的合同"某银行数字化转型项目合同"已通过审批',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        link: '/contracts',
      },
      {
        id: '2',
        type: 'warning',
        title: '投标截止提醒',
        content: '投标"智慧园区项目"将于3天后截止',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        link: '/tenders',
      },
      {
        id: '3',
        type: 'info',
        title: '新商机分配',
        content: '系统为您分配了新的商机"制造业MES系统"',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        link: '/opportunities',
      },
      {
        id: '4',
        type: 'error',
        title: '方案审批被拒绝',
        content: '您提交的方案"电商平台技术方案"被拒绝,原因:技术方案不够详细',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        link: '/solutions',
      },
      {
        id: '5',
        type: 'success',
        title: '项目赢单通知',
        content: '恭喜!项目"电商平台升级"已成功签约',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        link: '/projects',
      },
    ];

    setNotifications(mockNotifications);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    message.success('标记为已读');
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    message.success('全部标记为已读');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(notifications.filter((n) => n.id !== id));
    message.success('删除成功');
  };

  const handleClearAll = async () => {
    setNotifications([]);
    message.success('清空成功');
  };

  const handleClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#fa8c16', fontSize: 16 }} />;
      case 'error':
        return <WarningOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 16 }} />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return date.toLocaleDateString();
  };

  const notificationList = (
    <div style={{ width: 400, maxHeight: 500, overflowY: 'auto' }}>
      <Spin spinning={loading}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 500 }}>
            消息通知 ({unreadCount}未读)
          </span>
          <Space>
            {notifications.length > 0 && (
              <Button
                type="text"
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                全部已读
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                type="text"
                size="small"
                danger
                onClick={handleClearAll}
              >
                清空
              </Button>
            )}
          </Space>
        </div>

        <List
          dataSource={notifications}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无通知"
                style={{ padding: '40px 0' }}
              />
            ),
          }}
          renderItem={(notification) => (
            <List.Item
              style={{
                padding: '12px 16px',
                background: !notification.read ? '#f6ffed' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onClick={() => handleClick(notification)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = !notification.read ? '#f6ffed' : '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = !notification.read ? '#f6ffed' : 'transparent';
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={getIcon(notification.type)}
                    style={{
                      background: notification.type === 'success'
                        ? '#f6ffed'
                        : notification.type === 'warning'
                        ? '#fff7e6'
                        : notification.type === 'error'
                        ? '#fff1f0'
                        : '#e6f7ff',
                    }}
                  />
                }
                title={
                  <div style={{ marginBottom: 4 }}>
                    <Space size={4}>
                      <span style={{ fontWeight: 500 }}>{notification.title}</span>
                      {!notification.read && (
                        <Tag color="blue" size="small">
                          未读
                        </Tag>
                      )}
                    </Space>
                  </div>
                }
                description={
                  <div>
                    <p style={{ margin: '0 0 4px 0', color: '#595959' }}>
                      {notification.content}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                        {getTimeAgo(notification.createdAt)}
                      </span>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => handleDelete(notification.id, e)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Spin>
    </div>
  );

  return (
    <Dropdown
      open={visible}
      onOpenChange={setVisible}
      dropdownRender={() => notificationList}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge count={unreadCount} offset={[-5, 5]}>
        <Tooltip title="通知中心">
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 20 }} />}
            style={{
              padding: '0 8px',
              height: 'auto',
              display: 'flex',
              alignItems: 'center',
            }}
          />
        </Tooltip>
      </Badge>
    </Dropdown>
  );
};

export default NotificationCenter;

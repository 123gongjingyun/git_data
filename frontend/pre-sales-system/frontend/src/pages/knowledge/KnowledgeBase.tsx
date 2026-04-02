import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Space,
  message,
  Modal,
  Upload,
  List,
  Divider,
  Empty,
  Form,
  Spin,
  Popconfirm,
  Rate,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  UserOutlined,
  StarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { documentApi } from '../../services/api';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

interface Category {
  id: string;
  name: string;
  count: number;
  icon: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: DocCategory;
  type: string;
  author: string;
  createdAt: string;
  downloads: number;
  rating: number;
  description: string;
  tags: string[];
  status: DocStatus;
  isPublic: boolean;
}

enum DocCategory {
  REQUIREMENT = 'REQUIREMENT',
  TECHNICAL = 'TECHNICAL',
  COMMERCIAL = 'COMMERCIAL',
  CONTRACT = 'CONTRACT',
  PRESENTATION = 'PRESENTATION',
  OTHER = 'OTHER',
}

enum DocStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

const KnowledgeBase: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<KnowledgeItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [editItem, setEditItem] = useState<KnowledgeItem | null>(null);
  const [uploadForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 加载文档列表
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentApi.getList();
      setDocuments(response.data || []);
      
      // 统计分类数量
      const categoryCount = response.data.reduce((acc: any, doc: any) => {
        acc[doc.category] = (acc[doc.category] || 0) + 1;
        return acc;
      }, {});

      const categoryList: Category[] = [
        { id: 'all', name: '全部', count: response.data.length, icon: '📚' },
        { id: 'REQUIREMENT', name: '需求文档', count: categoryCount.REQUIREMENT || 0, icon: '📋' },
        { id: 'TECHNICAL', name: '技术方案', count: categoryCount.TECHNICAL || 0, icon: '💻' },
        { id: 'COMMERCIAL', name: '商务文档', count: categoryCount.COMMERCIAL || 0, icon: '💰' },
        { id: 'CONTRACT', name: '合同文档', count: categoryCount.CONTRACT || 0, icon: '📄' },
        { id: 'PRESENTATION', name: '演示文稿', count: categoryCount.PRESENTATION || 0, icon: '🎯' },
        { id: 'OTHER', name: '其他', count: categoryCount.OTHER || 0, icon: '📁' },
      ];
      setCategories(categoryList);
    } catch (error) {
      console.error('加载文档失败:', error);
      message.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      fixed: 'left' as const,
      width: 300,
      render: (text: string, record: KnowledgeItem) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => {
            setSelectedItem(record);
            setIsDetailModalVisible(true);
          }}>
            {text}
          </a>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {record.description}
          </span>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const categoryMap: Record<string, { text: string; color: string }> = {
          REQUIREMENT: { text: '需求文档', color: 'cyan' },
          TECHNICAL: { text: '技术方案', color: 'blue' },
          COMMERCIAL: { text: '商务文档', color: 'orange' },
          CONTRACT: { text: '合同文档', color: 'purple' },
          PRESENTATION: { text: '演示文稿', color: 'green' },
          OTHER: { text: '其他', color: 'default' },
        };
        const { text, color } = categoryMap[category] || { text: category, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
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
          PUBLISHED: { text: '已发布', color: 'success' },
          ARCHIVED: { text: '已归档', color: 'default' },
        };
        const { text, color } = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '文件类型',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 100,
      render: (type: string) => type.toUpperCase(),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 100,
      render: (author: string) => (
        <Space size={8}>
          <UserOutlined style={{ color: '#8c8c8c' }} />
          <span>{author}</span>
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <Space size={[4, 4]} wrap>
          {tags.map(tag => (
            <Tag key={tag} color="geekblue">{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '下载',
      dataIndex: 'downloads',
      key: 'downloads',
      width: 80,
      render: (downloads: number) => (
        <Space>
          <DownloadOutlined style={{ color: '#8c8c8c' }} />
          <span>{downloads}</span>
        </Space>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating: number) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          <span style={{ fontWeight: 500 }}>{rating}</span>
        </Space>
      ),
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
      render: (text: string, record: KnowledgeItem) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          />
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          />
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="确定要删除这个文档吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 过滤文档
  const filteredItems = documents.filter(item => {
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      !searchKeyword ||
      item.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.fileName.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchCategory && matchSearch;
  });

  // 事件处理函数
  const handleSearch = () => {
    message.success('搜索功能已更新');
  };

  const handleUpload = () => {
    setIsUploadModalVisible(true);
  };

  const handleUploadCancel = () => {
    setIsUploadModalVisible(false);
    uploadForm.resetFields();
    setFileList([]);
  };

  const handleUploadOk = async () => {
    try {
      const values = await uploadForm.validateFields();
      
      if (fileList.length === 0) {
        message.error('请选择要上传的文件');
        return;
      }

      setUploading(true);
      const formData = new FormData();
      fileList.forEach((file) => {
        formData.append('file', file.originFileObj as File);
      });
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('category', values.category);
      formData.append('tags', JSON.stringify(values.tags || []));

      await documentApi.upload(formData);
      message.success('文件上传成功！');
      setIsUploadModalVisible(false);
      uploadForm.resetFields();
      setFileList([]);
      loadDocuments();
    } catch (error: any) {
      console.error('上传失败:', error);
      message.error(error.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDetail = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setIsDetailModalVisible(true);
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditItem(item);
    editForm.setFieldsValue({
      title: item.title,
      description: item.description,
      category: item.category,
      tags: item.tags,
      isPublic: item.isPublic,
    });
    setIsEditModalVisible(true);
  };

  const handleEditOk = async () => {
    try {
      const values = await editForm.validateFields();
      setLoading(true);

      await documentApi.update(editItem!.id, values);
      message.success('文档更新成功！');
      setIsEditModalVisible(false);
      editForm.resetFields();
      setEditItem(null);
      loadDocuments();
    } catch (error: any) {
      console.error('更新失败:', error);
      message.error(error.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    editForm.resetFields();
    setEditItem(null);
  };

  const handleDownload = async (item: KnowledgeItem) => {
    try {
      const blob = await documentApi.download(item.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('下载成功');
    } catch (error) {
      console.error('下载失败:', error);
      message.error('下载失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await documentApi.delete(id);
      message.success('删除成功');
      loadDocuments();
    } catch (error: any) {
      console.error('删除失败:', error);
      message.error(error.response?.data?.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false;
    },
    fileList,
    multiple: false,
  };

  return (
    <div>
      <Row gutter={16}>
        {/* 左侧分类导航 */}
        <Col xs={24} lg={4}>
          <Card title="知识分类" size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {categories.map(category => (
                <div
                  key={category.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    background: selectedCategory === category.id ? '#1890ff' : 'transparent',
                    color: selectedCategory === category.id ? 'white' : 'inherit',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Space>
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </Space>
                  <span style={{
                    fontSize: 12,
                    background: selectedCategory === category.id ? 'rgba(255,255,255,0.2)' : '#f0f0f0',
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}>
                    {category.count}
                  </span>
                </div>
              ))}
            </div>

            <Divider />

            <div>
              <h4 style={{ marginBottom: 12, color: '#8c8c8c' }}>快速访问</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button type="text" icon={<ClockCircleOutlined />} style={{ textAlign: 'left' }}>
                  最近访问
                </Button>
                <Button type="text" icon={<StarOutlined />} style={{ textAlign: 'left' }}>
                  我的收藏
                </Button>
                <Button type="text" icon={<FolderOutlined />} style={{ textAlign: 'left' }}>
                  我的文档
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧内容区 */}
        <Col xs={24} lg={20}>
          {/* 搜索和操作栏 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Search
                  placeholder="搜索知识库..."
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="large"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onSearch={handleSearch}
                />
              </Col>
              <Col>
                <Select
                  placeholder="文件类型"
                  allowClear
                  style={{ width: 120 }}
                >
                  <Option value="pdf">PDF</Option>
                  <Option value="doc">Word</Option>
                  <Option value="ppt">PPT</Option>
                  <Option value="xls">Excel</Option>
                </Select>
              </Col>
              <Col>
                <Select
                  placeholder="排序方式"
                  allowClear
                  style={{ width: 120 }}
                >
                  <Option value="downloads">下载量</Option>
                  <Option value="rating">评分</Option>
                  <Option value="time">创建时间</Option>
                </Select>
              </Col>
              <Col>
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={loadDocuments}>
                    刷新
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleUpload}>
                    上传文档
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* 知识列表 */}
          <Card>
            <Spin spinning={loading}>
              {filteredItems.length > 0 ? (
                <Table
                  columns={columns}
                  dataSource={filteredItems}
                  rowKey="id"
                  pagination={{
                    total: filteredItems.length,
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`,
                  }}
                  scroll={{ x: 1400 }}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无相关知识内容"
                />
              )}
            </Spin>
          </Card>
        </Col>
      </Row>

      {/* 上传文档弹窗 */}
      <Modal
        title="上传文档"
        open={isUploadModalVisible}
        onOk={handleUploadOk}
        onCancel={handleUploadCancel}
        width={700}
        confirmLoading={uploading}
      >
        <Form form={uploadForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="文件选择"
            required
          >
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <FileTextOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个或批量上传。支持 doc、docx、ppt、pptx、pdf、xls 等格式
              </p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>

          <Form.Item
            name="category"
            label="所属分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类">
              <Option value="REQUIREMENT">需求文档</Option>
              <Option value="TECHNICAL">技术方案</Option>
              <Option value="COMMERCIAL">商务文档</Option>
              <Option value="CONTRACT">合同文档</Option>
              <Option value="PRESENTATION">演示文稿</Option>
              <Option value="OTHER">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="文档描述">
            <TextArea rows={4} placeholder="请输入文档描述" />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="请输入标签，按回车添加" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 知识详情弹窗 */}
      <Modal
        title="知识详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />}>
            下载文档
          </Button>,
        ]}
      >
        {selectedItem && (
          <div>
            <h2 style={{ marginBottom: 16 }}>{selectedItem.title}</h2>
            
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {selectedItem.downloads}
                    </div>
                    <div style={{ color: '#8c8c8c' }}>下载量</div>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                      {selectedItem.rating}
                    </div>
                    <div style={{ color: '#8c8c8c' }}>评分</div>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                      {selectedItem.tags.length}
                    </div>
                    <div style={{ color: '#8c8c8c' }}>标签数</div>
                  </div>
                </Card>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>描述</h4>
              <p style={{ color: '#595959', lineHeight: 1.8 }}>
                {selectedItem.description}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>标签</h4>
              <Space wrap>
                {selectedItem.tags.map(tag => (
                  <Tag key={tag} color="geekblue">{tag}</Tag>
                ))}
              </Space>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>元信息</h4>
              <List
                size="small"
                dataSource={[
                  { label: '作者', value: selectedItem.author },
                  { label: '分类', value: selectedItem.category },
                  { label: '类型', value: selectedItem.type },
                  { label: '创建时间', value: selectedItem.createdAt },
                ]}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.label}
                      description={item.value}
                    />
                  </List.Item>
                )}
              />
            </div>

            <div>
              <h4 style={{ marginBottom: 8 }}>文档预览</h4>
              <div style={{
                height: 200,
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                color: '#8c8c8c',
              }}>
                <FileTextOutlined style={{ fontSize: 48, marginRight: 16 }} />
                <span>暂无预览，请下载后查看</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑文档弹窗 */}
      <Modal
        title="编辑文档"
        open={isEditModalVisible}
        onOk={handleEditOk}
        onCancel={handleEditCancel}
        width={700}
        confirmLoading={loading}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="文档标题"
            rules={[{ required: true, message: '请输入文档标题' }]}
          >
            <Input placeholder="请输入文档标题" />
          </Form.Item>

          <Form.Item
            name="category"
            label="所属分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类">
              <Option value="REQUIREMENT">需求文档</Option>
              <Option value="TECHNICAL">技术方案</Option>
              <Option value="COMMERCIAL">商务文档</Option>
              <Option value="CONTRACT">合同文档</Option>
              <Option value="PRESENTATION">演示文稿</Option>
              <Option value="OTHER">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="文档描述">
            <TextArea rows={4} placeholder="请输入文档描述" />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="请输入标签，按回车添加" />
          </Form.Item>

          <Form.Item name="isPublic" label="是否公开" valuePropName="checked">
            <Select>
              <Option value={true}>公开</Option>
              <Option value={false}>私有</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KnowledgeBase;

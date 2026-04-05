import axios from 'axios';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权,清除token并跳转登录
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          console.error('没有权限访问');
          break;
        case 404:
          console.error('请求的资源不存在');
          break;
        case 500:
          console.error('服务器错误');
          break;
        default:
          console.error('请求失败:', error.response.data.message || '未知错误');
      }
    } else if (error.request) {
      console.error('网络错误,请检查网络连接');
    } else {
      console.error('请求配置错误:', error.message);
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authApi = {
  // 登录
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),

  // 注册
  register: (data: {
    username: string;
    email: string;
    password: string;
    realName?: string;
  }) => api.post('/auth/register', data),

  // 获取当前用户信息
  getProfile: () => api.get('/auth/profile'),
};

// 项目API
export const projectApi = {
  // 获取项目列表
  getList: (params?: any) => api.get('/projects', { params }),

  // 获取项目详情
  getDetail: (id: string) => api.get(`/projects/${id}`),

  // 创建项目
  create: (data: any) => api.post('/projects', data),

  // 更新项目
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),

  // 删除项目
  delete: (id: string) => api.delete(`/projects/${id}`),

  // 获取项目活动记录
  getActivities: (id: string) => api.get(`/projects/${id}/activities`),

  // 添加项目活动记录
  addActivity: (id: string, data: any) => api.post(`/projects/${id}/activities`, data),
};

// 商机API
export const opportunityApi = {
  getList: (params?: any) => api.get('/opportunities', { params }),
  getDetail: (id: string) => api.get(`/opportunities/${id}`),
  create: (data: any) => api.post('/opportunities', data),
  update: (id: string, data: any) => api.put(`/opportunities/${id}`, data),
  delete: (id: string) => api.delete(`/opportunities/${id}`),
};

// 解决方案API
export const solutionApi = {
  getList: (params?: any) => api.get('/solutions', { params }),
  getDetail: (id: string) => api.get(`/solutions/${id}`),
  create: (data: any) => api.post('/solutions', data),
  update: (id: string, data: any) => api.put(`/solutions/${id}`, data),
  delete: (id: string) => api.delete(`/solutions/${id}`),
  approve: (id: string, data: any) => api.post(`/solutions/${id}/approve`, data),
  reject: (id: string, data: any) => api.post(`/solutions/${id}/reject`, data),
};

// 投标API
export const tenderApi = {
  getList: (params?: any) => api.get('/tenders', { params }),
  getDetail: (id: string) => api.get(`/tenders/${id}`),
  create: (data: any) => api.post('/tenders', data),
  update: (id: string, data: any) => api.put(`/tenders/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/tenders/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/tenders/${id}`),
};

// 合同API
export const contractApi = {
  getList: (params?: any) => api.get('/contracts', { params }),
  getDetail: (id: string) => api.get(`/contracts/${id}`),
  create: (data: any) => api.post('/contracts', data),
  update: (id: string, data: any) => api.put(`/contracts/${id}`, data),
  approve: (id: string, data: any) => api.post(`/contracts/${id}/approve`, data),
  delete: (id: string) => api.delete(`/contracts/${id}`),
};

// 文档API
export const documentApi = {
  getList: (params?: any) => api.get('/documents', { params }),
  getById: (id: string) => api.get(`/documents/${id}`),
  upload: (formData: FormData) => {
    return api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id: string, data: any) => api.put(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
};

// 数据分析API
export const analyticsApi = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getFunnelData: (params?: any) => api.get('/analytics/funnel', { params }),
  getTrendData: (params?: any) => api.get('/analytics/trends', { params }),
  getDistributionData: (params?: any) => api.get('/analytics/distribution', { params }),
  getProjectProgress: (params?: any) => api.get('/analytics/project-progress', { params }),
};

export default api;

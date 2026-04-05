import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import ProjectList from './pages/project/ProjectList';
import ProjectDetail from './pages/project/ProjectDetail';
import OpportunityList from './pages/opportunity/OpportunityList';
import SolutionList from './pages/solution/SolutionList';
import TenderList from './pages/tender/TenderList';
import ContractList from './pages/contract/ContractList';
import KnowledgeBase from './pages/knowledge/KnowledgeBase';
import Analytics from './pages/analytics/Analytics';
import Settings from './pages/settings/Settings';
import TeamList from './pages/team/TeamList';
import TaskList from './pages/task/TaskList';
import './App.css';

// 模拟认证状态（实际项目需要从Redux或Context获取）
const isAuthenticated = true;

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          
          {/* 受保护路由 */}
          <Route
            path="/"
            element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<ProjectList />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="opportunities" element={<OpportunityList />} />
            <Route path="solutions" element={<SolutionList />} />
            <Route path="tenders" element={<TenderList />} />
            <Route path="contracts" element={<ContractList />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="teams" element={<TeamList />} />
            <Route path="tasks" element={<TaskList />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfigProvider,
  Dropdown,
  Layout,
  Menu,
  message,
  theme,
  Typography,
} from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  BgColorsOutlined,
  BookOutlined,
  DownOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SolutionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { LoginView } from "./views/LoginView";
import { BidsView } from "./views/BidsView";
import { ContractsView } from "./views/ContractsView";
import { KnowledgeView } from "./views/KnowledgeView";
import { AnalyticsView } from "./views/AnalyticsView";
import { SettingsView } from "./views/SettingsView";
import { SolutionsView } from "./views/SolutionsView";
import { WorkbenchView } from "./views/WorkbenchView";
import { ProjectsView } from "./views/ProjectsView";
import { OpportunitiesDemoView } from "./views/OpportunitiesDemoView";
import { HelpSupportView } from "./views/HelpSupportView";
import { defaultLogoConfig, type LogoConfig } from "./logoConfig";
import { hasMenuAccess, type CurrentUser } from "./shared/auth";
import {
  loadSharedDemoOpportunities,
  OPPORTUNITY_DEMO_UPDATED_EVENT,
  type DemoOpportunity,
} from "./shared/opportunityDemoData";
import {
  deriveBidsFromOpportunities,
  deriveContractsFromOpportunities,
  deriveSolutionsFromOpportunities,
} from "./shared/pipelineMock";
import { buildApiUrl } from "./shared/api";

const { Header, Content, Footer, Sider } = Layout;
const { Title, Paragraph } = Typography;

type MainMenuKey =
  | "workbench"
  | "projects"
  | "opportunities"
  | "solutions"
  | "bids"
  | "contracts"
  | "knowledge"
  | "analytics"
  | "settings"
  | "help";

type ThemeMode = "light" | "dark";
type SettingsEntryKey = "profile" | "security" | "notifications";

const PAGE_TITLE_MAP: Record<MainMenuKey, string> = {
  workbench: "工作台",
  projects: "项目管理",
  opportunities: "商机管理",
  solutions: "解决方案",
  bids: "投标管理",
  contracts: "合同管理",
  knowledge: "知识库",
  analytics: "数据分析",
  settings: "系统设置",
  help: "帮助与支持",
};

const PAGE_SUBTITLE_MAP: Record<MainMenuKey, string> = {
  workbench: "聚合待办、审批与关键节点，帮助团队快速进入工作状态。",
  projects: "统一跟踪售前项目进展、负责人和关键阶段。",
  opportunities: "集中管理线索、审批进度与预期成交信息。",
  solutions: "沉淀方案版本、评审状态与交付前设计资料。",
  bids: "汇总投标资料、标书准备与关键时间节点。",
  contracts: "跟踪签约进展、合同状态与回款相关信息。",
  knowledge: "统一管理售前知识、行业资料与文档沉淀。",
  analytics: "查看业务指标、权限效果与团队协作数据。",
  settings: "维护团队、权限、流程库与平台品牌配置。",
  help: "快速查看系统使用指引、支持渠道与常见问题。",
};

const DEFAULT_APP_NAME = "售前流程全生命周期管理系统";
const THEME_STORAGE_KEY = "appThemeMode";

const MAIN_MENU_DEFINITIONS: Array<{
  key: MainMenuKey;
  menuKey: string;
  label: string;
  icon: ReactNode;
}> = [
  {
    key: "workbench",
    menuKey: "menu.workbench",
    label: "工作台",
    icon: <AppstoreOutlined />,
  },
  {
    key: "projects",
    menuKey: "menu.projects",
    label: "项目管理",
    icon: <ProjectOutlined />,
  },
  {
    key: "opportunities",
    menuKey: "menu.opportunities",
    label: "商机管理",
    icon: <DollarOutlined />,
  },
  {
    key: "solutions",
    menuKey: "menu.solutions",
    label: "解决方案",
    icon: <SolutionOutlined />,
  },
  {
    key: "bids",
    menuKey: "menu.bids",
    label: "投标管理",
    icon: <FileDoneOutlined />,
  },
  {
    key: "contracts",
    menuKey: "menu.contracts",
    label: "合同管理",
    icon: <FileTextOutlined />,
  },
  {
    key: "knowledge",
    menuKey: "menu.knowledge",
    label: "知识库",
    icon: <BookOutlined />,
  },
  {
    key: "analytics",
    menuKey: "menu.analytics",
    label: "数据分析",
    icon: <BarChartOutlined />,
  },
  {
    key: "settings",
    menuKey: "menu.settings",
    label: "系统设置",
    icon: <SettingOutlined />,
  },
];

function App() {
  const [messageApi, contextHolder] = message.useMessage();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeMenu, setActiveMenu] = useState<MainMenuKey>("workbench");
  const [collapsed, setCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  });
  const [settingsEntryKey, setSettingsEntryKey] =
    useState<SettingsEntryKey>("profile");
  const [opportunitiesCustomerKeyword, setOpportunitiesCustomerKeyword] =
    useState<string | null>(null);
  const [opportunitiesStageFilter, setOpportunitiesStageFilter] = useState<
    string | null
  >(null);
  const [projectsKeyword, setProjectsKeyword] = useState<string | null>(null);
  const [solutionsKeyword, setSolutionsKeyword] = useState<string | null>(null);
  const [bidsKeyword, setBidsKeyword] = useState<string | null>(null);
  const [contractsKeyword, setContractsKeyword] = useState<string | null>(null);
  const [appName, setAppName] = useState<string>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_APP_NAME;
    }
    try {
      const stored = window.localStorage.getItem("appName");
      if (stored && stored.trim().length > 0) {
        return stored;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_APP_NAME;
  });
  const [logoConfig, setLogoConfig] = useState<LogoConfig>(() => {
    if (typeof window === "undefined") {
      return defaultLogoConfig;
    }
    try {
      const raw = window.localStorage.getItem("appLogoConfig");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LogoConfig>;
        if (
          parsed &&
          typeof parsed.usageKey === "string" &&
          typeof parsed.displayName === "string"
        ) {
          return {
            usageKey: parsed.usageKey,
            displayName: parsed.displayName,
          };
        }
      }
    } catch {
      // ignore parse errors
    }
    return defaultLogoConfig;
  });
  const [sharedOpportunities, setSharedOpportunities] = useState<DemoOpportunity[]>(
    () => loadSharedDemoOpportunities(),
  );
  const [readNotificationKeys, setReadNotificationKeys] = useState<string[]>([]);

  const isDarkMode = themeMode === "dark";
  const currentUsername = currentUser?.username || null;
  const currentRole = currentUser?.roleLabel || "访客";
  const solutions = useMemo(
    () => deriveSolutionsFromOpportunities(sharedOpportunities),
    [sharedOpportunities],
  );
  const bids = useMemo(
    () => deriveBidsFromOpportunities(sharedOpportunities),
    [sharedOpportunities],
  );
  const contracts = useMemo(
    () => deriveContractsFromOpportunities(sharedOpportunities),
    [sharedOpportunities],
  );
  const headerNotifications = useMemo(() => {
    const notices: Array<{
      key: string;
      label: string;
      hint: string;
      target: MainMenuKey;
      typeLabel: string;
      typeColor: string;
    }> = [];

    const reviewingSolution = solutions.find((item) => item.status === "reviewing");
    if (reviewingSolution) {
      notices.push({
        key: "solution-review",
        label: "待完成方案评审",
        hint: reviewingSolution.project,
        target: "solutions",
        typeLabel: "方案",
        typeColor: "#1677ff",
      });
    }

    const ongoingBid = bids.find((item) => item.status === "ongoing");
    if (ongoingBid) {
      notices.push({
        key: "bid-submit",
        label: "待提交投标文件",
        hint: ongoingBid.projectName,
        target: "bids",
        typeLabel: "投标",
        typeColor: "#fa8c16",
      });
    }

    const discoveryOpportunity = sharedOpportunities.find((item) =>
      ["discovery", "solution_design"].includes(item.stage || ""),
    );
    if (discoveryOpportunity) {
      notices.push({
        key: "opportunity-followup",
        label: "待安排客户调研",
        hint: discoveryOpportunity.name.replace(/^【示例】/, "").trim(),
        target: "opportunities",
        typeLabel: "商机",
        typeColor: "#13c2c2",
      });
    }

    const reviewingContract = contracts.find((item) => item.status === "reviewing");
    if (reviewingContract) {
      notices.push({
        key: "contract-review",
        label: "待推进合同谈判",
        hint: reviewingContract.projectName,
        target: "contracts",
        typeLabel: "合同",
        typeColor: "#eb2f96",
      });
    }

    return notices;
  }, [bids, contracts, sharedOpportunities, solutions]);
  const unreadNotificationCount = headerNotifications.filter(
    (item) => !readNotificationKeys.includes(item.key),
  ).length;
  const visibleMainMenus = MAIN_MENU_DEFINITIONS.filter((item) =>
    hasMenuAccess(currentUser, item.menuKey),
  );

  const themeTokens = useMemo(
    () => ({
      appBackground: isDarkMode ? "#07101f" : "#eff4fa",
      appGradient: isDarkMode
        ? "radial-gradient(circle at top, rgba(20,184,166,0.18), transparent 26%), linear-gradient(180deg, #08101f 0%, #040914 100%)"
        : "linear-gradient(180deg, #f8fbfd 0%, #edf3f8 100%)",
      siderBackground: isDarkMode
        ? "linear-gradient(180deg, #0f172a 0%, #111827 100%)"
        : "linear-gradient(180deg, #ffffff 0%, #f8fbfd 100%)",
      siderBorder: isDarkMode ? "rgba(148, 163, 184, 0.16)" : "#dbe5ef",
      headerBackground: isDarkMode
        ? "rgba(10, 18, 33, 0.92)"
        : "rgba(255,255,255,0.9)",
      headerBorder: isDarkMode ? "rgba(148, 163, 184, 0.18)" : "#e2e8f0",
      textPrimary: isDarkMode ? "#e5eefb" : "#0f172a",
      textSecondary: isDarkMode ? "#94a3b8" : "#64748b",
      panelBackground: isDarkMode
        ? "rgba(15, 23, 42, 0.9)"
        : "rgba(255,255,255,0.82)",
      panelBorder: isDarkMode ? "rgba(148, 163, 184, 0.16)" : "#dbeafe",
      accent: "#14b8a6",
      accentSoft: isDarkMode ? "rgba(20, 184, 166, 0.16)" : "#e6fffb",
      footerBackground: isDarkMode
        ? "rgba(8, 15, 29, 0.94)"
        : "rgba(255,255,255,0.88)",
    }),
    [isDarkMode],
  );

  const antdTheme = useMemo(
    () => ({
      algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: "#14b8a6",
        borderRadius: 14,
        colorBgBase: isDarkMode ? "#08101f" : "#f8fbfd",
        colorBgContainer: isDarkMode ? "#111b30" : "#ffffff",
        colorBgElevated: isDarkMode ? "#132038" : "#ffffff",
        colorBorder: isDarkMode ? "rgba(148, 163, 184, 0.16)" : "#dbe5ef",
        colorSplit: isDarkMode ? "rgba(148, 163, 184, 0.16)" : "#e2e8f0",
        colorText: isDarkMode ? "#e5eefb" : "#0f172a",
        colorTextSecondary: isDarkMode ? "#94a3b8" : "#64748b",
        boxShadowSecondary: isDarkMode
          ? "0 18px 38px rgba(2, 6, 23, 0.42)"
          : "0 16px 34px rgba(15, 23, 42, 0.12)",
      },
    }),
    [isDarkMode],
  );

  const getLogoVisual = () => {
    const usageKey = logoConfig.usageKey;
    if (usageKey === "app.logo.ai") {
      return {
        background:
          "linear-gradient(135deg, #1890ff 0%, #722ed1 50%, #fadb14 100%)",
        text: "AI",
      };
    }
    if (usageKey === "app.logo.main") {
      return {
        background: "#1890ff",
        text: "PS",
      };
    }
    return {
      background: "#13c2c2",
      text:
        (logoConfig.displayName && logoConfig.displayName.charAt(0)) || "L",
    };
  };

  const loadCurrentUser = useCallback(async (token: string) => {
    const response = await fetch(buildApiUrl("/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load current user: ${response.status}`);
    }

    const user = (await response.json()) as CurrentUser;
    setCurrentUser(user);
    return user;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const allowedMenuKeys = new Set(visibleMainMenus.map((item) => item.key));
    if (hasMenuAccess(currentUser, "menu.help")) {
      allowedMenuKeys.add("help");
    }
    if (!allowedMenuKeys.has(activeMenu)) {
      setActiveMenu(visibleMainMenus[0]?.key || "help");
    }
  }, [activeMenu, currentUser, visibleMainMenus]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem("accessToken");
    if (storedToken) {
      setAccessToken(storedToken);
      void loadCurrentUser(storedToken).catch(() => {
        window.localStorage.removeItem("accessToken");
        setAccessToken(null);
        setCurrentUser(null);
      });
    }
  }, [loadCurrentUser]);

  useEffect(() => {
    try {
      window.localStorage.setItem("appName", appName);
    } catch {
      // ignore storage errors
    }
  }, [appName]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // ignore storage errors
    }
    document.documentElement.dataset.theme = themeMode;
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem("appLogoConfig", JSON.stringify(logoConfig));
    } catch {
      // ignore storage errors
    }
  }, [logoConfig]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<DemoOpportunity[]>;
      if (Array.isArray(customEvent.detail)) {
        setSharedOpportunities(customEvent.detail);
        return;
      }
      setSharedOpportunities(loadSharedDemoOpportunities());
    };
    window.addEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener(OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  useEffect(() => {
    setReadNotificationKeys((prev) =>
      prev.filter((key) => headerNotifications.some((item) => item.key === key)),
    );
  }, [headerNotifications]);

  useEffect(() => {
    const loadBrandingFromServer = async () => {
      try {
        const resp = await fetch(buildApiUrl("/settings/branding"), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!resp.ok) {
          return;
        }
        const json = (await resp.json()) as {
          success?: boolean;
          data?: {
            appName?: string;
            logo?: { usageKey?: string; displayName?: string };
          } | null;
        };
        if (!json || !json.data) {
          return;
        }
        const nextName = json.data.appName;
        const nextLogo = json.data.logo;
        if (nextName && typeof nextName === "string") {
          setAppName(nextName);
        }
        if (
          nextLogo &&
          typeof nextLogo.usageKey === "string" &&
          typeof nextLogo.displayName === "string"
        ) {
          setLogoConfig({
            usageKey: nextLogo.usageKey,
            displayName: nextLogo.displayName,
          });
        }
      } catch {
        // ignore unavailable backend
      }
    };

    void loadBrandingFromServer();
  }, []);

  const handleLoginSuccess = (token: string, user: CurrentUser) => {
    window.localStorage.setItem("accessToken", token);
    setAccessToken(token);
    setCurrentUser(user);
    messageApi.success(`欢迎回来，${user.displayName || user.username}`);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("accessToken");
    setAccessToken(null);
    setCurrentUser(null);
    setActiveMenu("workbench");
    setSettingsEntryKey("profile");
    messageApi.success("已安全退出登录");
  };

  const openSettingsEntry = (entryKey: SettingsEntryKey) => {
    setSettingsEntryKey(entryKey);
    setActiveMenu("settings");
  };

  const renderMainContent = () => {
    if (!accessToken) {
      return (
        <LoginView
          appName={appName}
          logoVisual={getLogoVisual()}
          themeMode={themeMode}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }

    if (!currentUser) {
      return (
        <Card>
          <Title level={4}>正在恢复登录状态</Title>
          <Paragraph type="secondary">
            已检测到本地访问令牌，正在从服务器加载当前用户信息。
          </Paragraph>
        </Card>
      );
    }

    switch (activeMenu) {
      case "workbench":
        return (
          <WorkbenchView
            onNavigateToProjects={(projectName?: string) => {
              setProjectsKeyword(projectName ?? null);
              setActiveMenu("projects");
            }}
            onNavigateToOpportunities={(keyword?: string, stage?: string) => {
              setOpportunitiesCustomerKeyword(keyword ?? null);
              setOpportunitiesStageFilter(stage ?? null);
              setActiveMenu("opportunities");
            }}
            onNavigateToSolutions={(projectName?: string) => {
              setSolutionsKeyword(projectName ?? null);
              setActiveMenu("solutions");
            }}
            onNavigateToBids={(projectName?: string) => {
              setBidsKeyword(projectName ?? null);
              setActiveMenu("bids");
            }}
            onNavigateToContracts={(projectName?: string) => {
              setContractsKeyword(projectName ?? null);
              setActiveMenu("contracts");
            }}
            onNavigateToAnalytics={() => {
              setActiveMenu("analytics");
            }}
          />
        );
      case "opportunities":
        return (
          <OpportunitiesDemoView
            accessToken={accessToken}
            currentUsername={currentUsername}
            currentUser={currentUser}
            initialCustomerKeyword={opportunitiesCustomerKeyword}
            initialStageFilter={opportunitiesStageFilter}
            onNavigateToProject={(projectName?: string) => {
              if (projectName && projectName.trim().length > 0) {
                setProjectsKeyword(projectName.trim());
              } else {
                setProjectsKeyword(null);
              }
              setActiveMenu("projects");
            }}
          />
        );
      case "projects":
        return (
          <ProjectsView
            currentUser={currentUser}
            onNavigateToOpportunities={(
              customerName?: string,
              projectStage?: string,
            ) => {
              setOpportunitiesCustomerKeyword(customerName || null);
              setOpportunitiesStageFilter(projectStage ?? null);
              setActiveMenu("opportunities");
            }}
            onNavigateToSolutions={(projectName?: string) => {
              setSolutionsKeyword(projectName ?? null);
              setActiveMenu("solutions");
            }}
            onNavigateToBids={(projectName?: string) => {
              setBidsKeyword(projectName ?? null);
              setActiveMenu("bids");
            }}
            onNavigateToContracts={(projectName?: string) => {
              setContractsKeyword(projectName ?? null);
              setActiveMenu("contracts");
            }}
            initialKeyword={projectsKeyword}
          />
        );
      case "solutions":
        return (
          <SolutionsView
            currentUser={currentUser}
            initialProjectKeyword={solutionsKeyword}
            onNavigateToProjects={(projectName?: string) => {
              setProjectsKeyword(projectName ?? null);
              setActiveMenu("projects");
            }}
          />
        );
      case "bids":
        return (
          <BidsView
            currentUser={currentUser}
            initialKeyword={bidsKeyword}
            onNavigateToProjects={(projectName?: string) => {
              setProjectsKeyword(projectName ?? null);
              setActiveMenu("projects");
            }}
          />
        );
      case "contracts":
        return (
          <ContractsView
            currentUser={currentUser}
            initialKeyword={contractsKeyword}
            onNavigateToProjects={(projectName?: string) => {
              setProjectsKeyword(projectName ?? null);
              setActiveMenu("projects");
            }}
          />
        );
      case "knowledge":
        return <KnowledgeView currentUser={currentUser} />;
      case "analytics":
        return <AnalyticsView currentUser={currentUser} themeMode={themeMode} />;
      case "settings":
        return (
          <SettingsView
            appName={appName}
            logoConfig={logoConfig}
            onChangeAppName={setAppName}
            onChangeLogo={setLogoConfig}
            currentUser={currentUser}
            initialMenu={settingsEntryKey}
            accessToken={accessToken}
            onCurrentUserChange={setCurrentUser}
          />
        );
      case "help":
        return <HelpSupportView />;
      default:
        return null;
    }
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人资料",
      onClick: () => openSettingsEntry("profile"),
    },
    {
      key: "security",
      icon: <LockOutlined />,
      label: "修改密码",
      onClick: () => openSettingsEntry("security"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  return (
    <ConfigProvider theme={antdTheme}>
      {contextHolder}
      <Layout
        className="app-shell"
        data-theme={themeMode}
        style={{
          minHeight: "100vh",
          height: "100vh",
          overflow: "hidden",
          background: themeTokens.appBackground,
        }}
      >
        {accessToken ? (
          <>
            <Sider
              width={232}
              collapsible
              collapsed={collapsed}
              trigger={null}
              style={{
                background: themeTokens.siderBackground,
                height: "100vh",
                position: "sticky",
                top: 0,
                left: 0,
                overflow: "hidden",
                borderRight: `1px solid ${themeTokens.siderBorder}`,
                boxShadow: isDarkMode
                  ? "16px 0 36px rgba(2, 6, 23, 0.42)"
                  : "12px 0 28px rgba(15, 23, 42, 0.12)",
                zIndex: 20,
              }}
            >
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    height: 70,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    color: themeTokens.textPrimary,
                    fontWeight: 700,
                    fontSize: collapsed ? 14 : 18,
                    borderBottom: `1px solid ${themeTokens.siderBorder}`,
                    paddingInline: collapsed ? 0 : 18,
                    gap: 10,
                  }}
                >
                  {(() => {
                    const visual = getLogoVisual();
                    return (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          background: visual.background,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          marginRight: collapsed ? 0 : 4,
                          boxShadow: "0 10px 22px rgba(20, 184, 166, 0.18)",
                        }}
                        aria-label={logoConfig.displayName}
                      >
                        {visual.text}
                      </div>
                    );
                  })()}
                  {!collapsed && <span>{appName}</span>}
                </div>
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: 10,
                  }}
                >
                  <Menu
                    mode="inline"
                    selectedKeys={[activeMenu]}
                    onClick={(info) => {
                      setActiveMenu(info.key as MainMenuKey);
                    }}
                    items={visibleMainMenus.map((item) => ({
                      key: item.key,
                      icon: item.icon,
                      label: item.label,
                    }))}
                    style={{
                      borderInlineEnd: "none",
                      background: "transparent",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: "auto",
                    borderTop: `1px solid ${themeTokens.siderBorder}`,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <Button
                    type="text"
                    onClick={() =>
                      setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))
                    }
                    icon={<BgColorsOutlined />}
                    style={{
                      justifyContent: collapsed ? "center" : "flex-start",
                      height: 44,
                      borderRadius: 14,
                      color: themeTokens.textPrimary,
                      background: isDarkMode
                        ? "rgba(148, 163, 184, 0.12)"
                        : "rgba(15, 23, 42, 0.05)",
                    }}
                  >
                    {!collapsed && (isDarkMode ? "浅色模式" : "深色模式")}
                  </Button>
                  {hasMenuAccess(currentUser, "menu.help") && (
                    <Button
                      type="text"
                      onClick={() => setActiveMenu("help")}
                      icon={<QuestionCircleOutlined />}
                      style={{
                        justifyContent: collapsed ? "center" : "flex-start",
                        height: 44,
                        borderRadius: 14,
                        color:
                          activeMenu === "help"
                            ? "#062925"
                            : themeTokens.textPrimary,
                        background:
                          activeMenu === "help"
                            ? themeTokens.accent
                            : "transparent",
                      }}
                    >
                      {!collapsed && "帮助与支持"}
                    </Button>
                  )}
                </div>
              </div>
            </Sider>
            <Layout
              style={{
                minWidth: 0,
                height: "100vh",
                overflow: "hidden",
                background: themeTokens.appGradient,
              }}
            >
              <Header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 78,
                  padding: "0 20px",
                  background: themeTokens.headerBackground,
                  borderBottom: `1px solid ${themeTokens.headerBorder}`,
                  color: themeTokens.textPrimary,
                  backdropFilter: "blur(12px)",
                  position: "sticky",
                  top: 0,
                  zIndex: 15,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <Button
                    type="text"
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() => setCollapsed((prev) => !prev)}
                    style={{
                      color: themeTokens.textPrimary,
                      fontSize: 18,
                      borderRadius: 12,
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span
                      style={{
                        fontWeight: 800,
                        color: themeTokens.textPrimary,
                        lineHeight: 1.2,
                      }}
                    >
                      {PAGE_TITLE_MAP[activeMenu]}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: themeTokens.textSecondary,
                        lineHeight: 1.3,
                      }}
                    >
                      {PAGE_SUBTITLE_MAP[activeMenu]}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Dropdown
                    menu={{
                      items:
                        headerNotifications.length > 0
                          ? headerNotifications.map((item) => ({
                              key: item.key,
                              label: (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: 8,
                                    }}
                                  >
                                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        color: item.typeColor,
                                        background: `color-mix(in srgb, ${item.typeColor} 16%, transparent)`,
                                      }}
                                    >
                                      {item.typeLabel}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: 12, opacity: 0.72 }}>{item.hint}</span>
                                </div>
                              ),
                            }))
                          : [
                              {
                                key: "empty",
                                disabled: true,
                                label: "当前没有待处理告警",
                              },
                            ],
                      onClick: ({ key }) => {
                        const target = headerNotifications.find((item) => item.key === key);
                        if (target) {
                          setReadNotificationKeys((prev) =>
                            prev.includes(target.key) ? prev : [...prev, target.key],
                          );
                          setActiveMenu(target.target);
                        }
                      },
                    }}
                    onOpenChange={(open) => {
                      if (open && headerNotifications.length > 0) {
                        setReadNotificationKeys(headerNotifications.map((item) => item.key));
                      }
                    }}
                    trigger={["click"]}
                  >
                    <Button
                      type="text"
                      style={{
                        color: themeTokens.textPrimary,
                        borderRadius: 12,
                      }}
                      icon={
                        <Badge count={unreadNotificationCount} size="small">
                          <BellOutlined
                            style={{ fontSize: 18, color: themeTokens.textPrimary }}
                          />
                        </Badge>
                      }
                    />
                  </Dropdown>
                  <Dropdown
                    menu={{
                      items: userMenuItems.map((item) => ({
                        key: item.key,
                        icon: item.icon,
                        label: item.label,
                      })),
                      onClick: ({ key }) => {
                        userMenuItems.find((item) => item.key === key)?.onClick();
                      },
                    }}
                    trigger={["click"]}
                  >
                    <Button
                      type="text"
                      style={{
                        height: 48,
                        paddingInline: 10,
                        borderRadius: 16,
                        color: themeTokens.textPrimary,
                        background: themeTokens.panelBackground,
                        border: `1px solid ${themeTokens.panelBorder}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar style={{ backgroundColor: themeTokens.accent }}>
                          {(currentUser?.displayName || currentUsername || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </Avatar>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            lineHeight: 1.15,
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 700 }}>
                            {currentUser?.displayName || currentUsername || "已登录用户"}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: themeTokens.textSecondary,
                            }}
                          >
                            {currentRole}
                          </span>
                        </div>
                        <DownOutlined
                          style={{
                            fontSize: 12,
                            color: themeTokens.textSecondary,
                          }}
                        />
                      </div>
                    </Button>
                  </Dropdown>
                </div>
              </Header>
              <Content
                style={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: "18px 20px 12px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 1460,
                    margin: "0 auto",
                  }}
                >
                  {renderMainContent()}
                </div>
              </Content>
              <Footer
                style={{
                  textAlign: "center",
                  padding: "10px 20px 14px",
                  color: themeTokens.textSecondary,
                  background: themeTokens.footerBackground,
                  borderTop: `1px solid ${themeTokens.headerBorder}`,
                }}
              >
                欢迎来到 {appName}，让售前项目、团队协作与审批流程更高效。
              </Footer>
            </Layout>
          </>
        ) : (
          <Content
            style={{
              minHeight: "100vh",
              padding: 0,
              background: themeTokens.appBackground,
            }}
          >
            <LoginView
              appName={appName}
              logoVisual={getLogoVisual()}
              themeMode={themeMode}
              onLoginSuccess={handleLoginSuccess}
            />
          </Content>
        )}
      </Layout>
    </ConfigProvider>
  );
}

export default App;

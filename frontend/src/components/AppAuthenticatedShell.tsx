import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Card, Dropdown, Layout, Menu, Spin, Typography } from "antd";
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
import { hasMenuAccess, type CurrentUser } from "../shared/auth";
import type { LogoConfig } from "../logoConfig";
import type { DemoOpportunity } from "../shared/opportunityDemoData";

const { Header, Content, Footer, Sider } = Layout;
const { Text } = Typography;

const LazyWorkbenchView = lazy(async () => {
  const module = await import("../views/WorkbenchView");
  return { default: module.WorkbenchView };
});

const LazyBidsView = lazy(async () => {
  const module = await import("../views/BidsView");
  return { default: module.BidsView };
});

const LazyContractsView = lazy(async () => {
  const module = await import("../views/ContractsView");
  return { default: module.ContractsView };
});

const LazyKnowledgeView = lazy(async () => {
  const module = await import("../views/KnowledgeView");
  return { default: module.KnowledgeView };
});

const LazyAnalyticsView = lazy(async () => {
  const module = await import("../views/AnalyticsView");
  return { default: module.AnalyticsView };
});

const LazySettingsView = lazy(async () => {
  const module = await import("../views/SettingsView");
  return { default: module.SettingsView };
});

const LazySolutionsView = lazy(async () => {
  const module = await import("../views/SolutionsView");
  return { default: module.SolutionsView };
});

const LazyProjectsView = lazy(async () => {
  const module = await import("../views/ProjectsView");
  return { default: module.ProjectsView };
});

const LazyOpportunitiesDemoView = lazy(async () => {
  const module = await import("../views/OpportunitiesDemoView");
  return { default: module.OpportunitiesDemoView };
});

const LazyHelpSupportView = lazy(async () => {
  const module = await import("../views/HelpSupportView");
  return { default: module.HelpSupportView };
});

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

function AppSectionLoading(props: { title: string; description: string }) {
  const { title, description } = props;

  return (
    <Card
      style={{
        minHeight: 320,
      }}
    >
      <div
        style={{
          minHeight: 240,
          display: "grid",
          placeItems: "center",
          gap: 12,
          textAlign: "center",
        }}
      >
        <Spin size="large" />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{title}</div>
          <Text type="secondary">{description}</Text>
        </div>
      </div>
    </Card>
  );
}

function getOpportunityTitle(opportunity: DemoOpportunity) {
  const baseName = opportunity.projectName || opportunity.name || "-";
  return baseName.replace(/^【示例】/, "").trim();
}

interface AppAuthenticatedShellProps {
  accessToken: string;
  currentUser: CurrentUser;
  appName: string;
  logoConfig: LogoConfig;
  logoVisual: {
    background: string;
    text: string;
  };
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onChangeAppName: (appName: string) => void;
  onChangeLogo: (logoConfig: LogoConfig) => void;
  onCurrentUserChange: (user: CurrentUser | null) => void;
  onLogout: () => void;
}

export function AppAuthenticatedShell(props: AppAuthenticatedShellProps) {
  const {
    accessToken,
    currentUser,
    appName,
    logoConfig,
    logoVisual,
    themeMode,
    onThemeModeChange,
    onChangeAppName,
    onChangeLogo,
    onCurrentUserChange,
    onLogout,
  } = props;
  const [activeMenu, setActiveMenu] = useState<MainMenuKey>("workbench");
  const [collapsed, setCollapsed] = useState(false);
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
  const [sharedOpportunities, setSharedOpportunities] = useState<DemoOpportunity[]>([]);
  const [readNotificationKeys, setReadNotificationKeys] = useState<string[]>([]);

  const isDarkMode = themeMode === "dark";
  const currentUsername = currentUser.username || null;
  const currentRole = currentUser.roleLabel || "访客";

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

  const headerNotifications = useMemo(() => {
    const notices: Array<{
      key: string;
      label: string;
      hint: string;
      target: MainMenuKey;
      typeLabel: string;
      typeColor: string;
    }> = [];

    const reviewingSolution = sharedOpportunities.find((item) => {
      const stage = item.stage || "discovery";
      const rejected = item.approvalStatus === "rejected";
      const approved = item.approvalStatus === "approved";
      if (rejected || stage === "discovery" || stage === "won" || stage === "lost") {
        return false;
      }
      return !approved;
    });
    if (reviewingSolution) {
      notices.push({
        key: "solution-review",
        label: "待完成方案评审",
        hint: getOpportunityTitle(reviewingSolution),
        target: "solutions",
        typeLabel: "方案",
        typeColor: "#1677ff",
      });
    }

    const ongoingBid = sharedOpportunities.find((item) =>
      ["proposal", "bidding", "negotiation"].includes(item.stage || ""),
    );
    if (ongoingBid) {
      notices.push({
        key: "bid-submit",
        label: "待提交投标文件",
        hint: getOpportunityTitle(ongoingBid),
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
        hint: getOpportunityTitle(discoveryOpportunity),
        target: "opportunities",
        typeLabel: "商机",
        typeColor: "#13c2c2",
      });
    }

    const reviewingContract = sharedOpportunities.find(
      (item) => item.stage === "negotiation",
    );
    if (reviewingContract) {
      notices.push({
        key: "contract-review",
        label: "待推进合同谈判",
        hint: getOpportunityTitle(reviewingContract),
        target: "contracts",
        typeLabel: "合同",
        typeColor: "#eb2f96",
      });
    }

    return notices;
  }, [sharedOpportunities]);

  const unreadNotificationCount = headerNotifications.filter(
    (item) => !readNotificationKeys.includes(item.key),
  ).length;
  const visibleMainMenus = MAIN_MENU_DEFINITIONS.filter((item) =>
    hasMenuAccess(currentUser, item.menuKey),
  );

  useEffect(() => {
    const allowedMenuKeys = new Set(visibleMainMenus.map((item) => item.key));
    if (hasMenuAccess(currentUser, "menu.help")) {
      allowedMenuKeys.add("help");
    }
    if (!allowedMenuKeys.has(activeMenu)) {
      setActiveMenu(visibleMainMenus[0]?.key || "help");
    }
  }, [activeMenu, currentUser, visibleMainMenus]);

  useEffect(() => {
    setReadNotificationKeys((prev) =>
      prev.filter((key) => headerNotifications.some((item) => item.key === key)),
    );
  }, [headerNotifications]);

  useEffect(() => {
    if (typeof window === "undefined" || !accessToken) {
      setSharedOpportunities([]);
      return undefined;
    }

    let disposed = false;
    let removeListener: (() => void) | undefined;

    void import("../shared/opportunityDemoData").then((module) => {
      if (disposed) {
        return;
      }
      setSharedOpportunities(module.ensureSharedDemoOpportunities());
      const handleUpdated = (event: Event) => {
        const customEvent = event as CustomEvent<DemoOpportunity[]>;
        if (Array.isArray(customEvent.detail)) {
          setSharedOpportunities((prev) =>
            module.hasSameDemoOpportunities(prev, customEvent.detail)
              ? prev
              : customEvent.detail,
          );
          return;
        }
        setSharedOpportunities((prev) => {
          const next = module.loadSharedDemoOpportunities();
          return module.hasSameDemoOpportunities(prev, next) ? prev : next;
        });
      };
      window.addEventListener(module.OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
      removeListener = () =>
        window.removeEventListener(module.OPPORTUNITY_DEMO_UPDATED_EVENT, handleUpdated);
    });

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [accessToken]);

  const openSettingsEntry = (entryKey: SettingsEntryKey) => {
    setSettingsEntryKey(entryKey);
    setActiveMenu("settings");
  };

  const renderMainContent = () => {
    switch (activeMenu) {
      case "workbench":
        return (
          <Suspense
            fallback={
              <AppSectionLoading
                title="正在加载工作台"
                description="正在准备待办、项目概览与月度指标。"
              />
            }
          >
            <LazyWorkbenchView
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
          </Suspense>
        );
      case "opportunities":
        return (
          <LazyOpportunitiesDemoView
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
          <LazyProjectsView
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
          <LazySolutionsView
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
          <LazyBidsView
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
          <LazyContractsView
            currentUser={currentUser}
            initialKeyword={contractsKeyword}
            onNavigateToProjects={(projectName?: string) => {
              setProjectsKeyword(projectName ?? null);
              setActiveMenu("projects");
            }}
          />
        );
      case "knowledge":
        return <LazyKnowledgeView currentUser={currentUser} />;
      case "analytics":
        return <LazyAnalyticsView currentUser={currentUser} themeMode={themeMode} />;
      case "settings":
        return (
          <LazySettingsView
            appName={appName}
            logoConfig={logoConfig}
            onChangeAppName={onChangeAppName}
            onChangeLogo={onChangeLogo}
            currentUser={currentUser}
            initialMenu={settingsEntryKey}
            accessToken={accessToken}
            onCurrentUserChange={onCurrentUserChange}
          />
        );
      case "help":
        return <LazyHelpSupportView />;
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
      onClick: onLogout,
    },
  ];

  return (
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
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: logoVisual.background,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                marginRight: collapsed ? 0 : 4,
                boxShadow: "0 10px 22px rgba(20, 184, 166, 0.18)",
              }}
              aria-label={logoConfig.displayName}
            >
              {logoVisual.text}
            </div>
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
                onThemeModeChange(themeMode === "dark" ? "light" : "dark")
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
                    {(currentUser.displayName || currentUsername || "U")
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
                      {currentUser.displayName || currentUsername || "已登录用户"}
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
            <Suspense
              fallback={
                <AppSectionLoading
                  title="正在加载页面"
                  description="当前页面按需加载中，以减少平台主入口的初始包体积。"
                />
              }
            >
              {renderMainContent()}
            </Suspense>
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
  );
}

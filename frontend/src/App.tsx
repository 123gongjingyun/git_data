import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Card, ConfigProvider, Layout, Spin, message, theme, Typography } from "antd";
import { defaultLogoConfig, type LogoConfig } from "./logoConfig";
import type { CurrentUser } from "./shared/auth";
import { buildApiUrl } from "./shared/api";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const LazyLoginView = lazy(async () => {
  const module = await import("./views/LoginView");
  return { default: module.LoginView };
});

const LazyAppAuthenticatedShell = lazy(async () => {
  const module = await import("./components/AppAuthenticatedShell");
  return { default: module.AppAuthenticatedShell };
});

function LoginViewLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 420,
        }}
      >
        <div
          style={{
            minHeight: 220,
            display: "grid",
            placeItems: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <Spin size="large" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              正在加载登录页
            </div>
            <Typography.Text type="secondary">
              正在准备账号登录与注册界面。
            </Typography.Text>
          </div>
        </div>
      </Card>
    </div>
  );
}

type ThemeMode = "light" | "dark";

const DEFAULT_APP_NAME = "售前流程全生命周期管理系统";
const THEME_STORAGE_KEY = "appThemeMode";

function App() {
  const [messageApi, contextHolder] = message.useMessage();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  });
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
  const isDarkMode = themeMode === "dark";
  const appBackground = isDarkMode ? "#07101f" : "#eff4fa";

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
    messageApi.success("已安全退出登录");
  };

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
          background: appBackground,
        }}
      >
        {accessToken ? (
          currentUser ? (
            <Suspense
              fallback={
                <Card style={{ margin: 24 }}>
                  <Title level={4}>正在加载应用工作区</Title>
                  <Paragraph type="secondary">
                    正在准备菜单、顶栏通知和业务页面壳层。
                  </Paragraph>
                </Card>
              }
            >
              <LazyAppAuthenticatedShell
                accessToken={accessToken}
                currentUser={currentUser}
                appName={appName}
                logoConfig={logoConfig}
                logoVisual={getLogoVisual()}
                themeMode={themeMode}
                onThemeModeChange={setThemeMode}
                onChangeAppName={setAppName}
                onChangeLogo={setLogoConfig}
                onCurrentUserChange={setCurrentUser}
                onLogout={handleLogout}
              />
            </Suspense>
          ) : (
            <Content
              style={{
                minHeight: "100vh",
                padding: 24,
                background: appBackground,
              }}
            >
              <Card>
                <Title level={4}>正在恢复登录状态</Title>
                <Paragraph type="secondary">
                  已检测到本地访问令牌，正在从服务器加载当前用户信息。
                </Paragraph>
              </Card>
            </Content>
          )
        ) : (
          <Content
            style={{
              minHeight: "100vh",
              padding: 0,
              background: appBackground,
            }}
          >
            <Suspense fallback={<LoginViewLoading />}>
              <LazyLoginView
                appName={appName}
                logoVisual={getLogoVisual()}
                themeMode={themeMode}
                onLoginSuccess={handleLoginSuccess}
              />
            </Suspense>
          </Content>
        )}
      </Layout>
    </ConfigProvider>
  );
}

export default App;

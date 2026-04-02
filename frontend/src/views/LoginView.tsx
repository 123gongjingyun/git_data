import { useState } from "react";
import { Form, Input, Button, Typography, message } from "antd";
import { UserOutlined, LockOutlined, MailOutlined, DownOutlined } from "@ant-design/icons";
import type { CurrentUser } from "../shared/auth";
import { buildApiUrl } from "../shared/api";

const { Title, Paragraph } = Typography;

interface LoginViewProps {
  appName: string;
  logoVisual: {
    background: string;
    text: string;
  };
  themeMode: "light" | "dark";
  onLoginSuccess: (token: string, user: CurrentUser) => void;
}

export function LoginView({
  appName,
  logoVisual,
  themeMode,
  onLoginSuccess,
}: LoginViewProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [form] = Form.useForm();
  const isDark = themeMode === "dark";

  const shellBackground = isDark
    ? "linear-gradient(180deg, #07141a 0%, #0b1724 38%, #102033 100%)"
    : "linear-gradient(180deg, #f7fbfb 0%, #eef5f6 46%, #e9f1f3 100%)";
  const shellGrid = isDark
    ? "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)"
    : "linear-gradient(rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.10) 1px, transparent 1px)";
  const panelBackground = isDark
    ? "linear-gradient(180deg, rgba(12,24,38,0.84) 0%, rgba(10,20,31,0.92) 100%)"
    : "rgba(255,255,255,0.78)";
  const panelBorder = isDark
    ? "1px solid rgba(148, 163, 184, 0.18)"
    : "1px solid rgba(255,255,255,0.82)";
  const panelShadow = isDark
    ? "0 28px 70px rgba(2, 6, 23, 0.42)"
    : "0 28px 70px rgba(15, 23, 42, 0.16)";
  const headingColor = isDark ? "#f8fafc" : "#0f172a";
  const mutedText = isDark ? "rgba(226, 232, 240, 0.72)" : "#64748b";
  const subtleText = isDark ? "rgba(226, 232, 240, 0.88)" : "#475569";
  const fieldIconColor = isDark ? "rgba(148, 163, 184, 0.82)" : "#94a3b8";
  const primaryShadow = isDark
    ? "0 16px 30px rgba(20, 184, 166, 0.2)"
    : "0 16px 30px rgba(20, 184, 166, 0.24)";
  const brandBlockBackground = isDark
    ? "rgba(9, 20, 34, 0.52)"
    : "rgba(255, 255, 255, 0.32)";

  const handleSubmit = async (values: {
    username: string;
    displayName?: string;
    email?: string;
    password: string;
  }) => {
    const endpoint =
      authMode === "login"
        ? buildApiUrl("/auth/login")
        : buildApiUrl("/auth/register");
    const trimmedIdentity = values.username.trim();
    const payload =
      authMode === "login"
        ? {
            username: trimmedIdentity,
            password: values.password,
          }
        : {
            username: trimmedIdentity,
            displayName: values.displayName,
            email: values.email?.trim(),
            password: values.password,
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => undefined);
        const messageText =
          (errorBody && (errorBody.message as string)) ||
          (authMode === "login"
            ? "登录失败，请检查账号密码"
            : "注册失败，请检查输入信息");
        message.error(messageText);
        return;
      }

      const data = (await response.json()) as {
        accessToken?: string;
        user?: CurrentUser;
      };
      const token = data.accessToken as string | undefined;
      const user = data.user;

      if (authMode === "login") {
        if (token && user) {
          onLoginSuccess(token, user);
        }
        return;
      }

      message.success("注册成功，请使用新账号登录");
      setAuthMode("login");
      form.setFieldsValue({
        username: trimmedIdentity,
        password: "",
        displayName: "",
        email: "",
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Authentication request failed:", error);
      message.error("无法连接到服务器，请检查后端服务是否已启动");
    }
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: shellBackground,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: shellGrid,
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.78), rgba(0,0,0,0.45))",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(45,212,191,0.22) 0%, rgba(45,212,191,0.08) 38%, rgba(45,212,191,0) 72%)",
          top: -120,
          right: -40,
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0.05) 42%, rgba(20,184,166,0) 74%)",
          bottom: -140,
          left: -80,
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              alignSelf: "center",
              padding: "12px 14px",
              borderRadius: 22,
              background: brandBlockBackground,
              backdropFilter: "blur(14px)",
              textAlign: "center",
              width: "100%",
              maxWidth: 320,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 12px",
                borderRadius: 18,
                background: logoVisual.background,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: "#ffffff",
                boxShadow: "0 12px 26px rgba(15, 23, 42, 0.18)",
              }}
            >
              {logoVisual.text}
            </div>
            <Paragraph
              style={{
                marginBottom: 0,
                color: headingColor,
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.35,
              }}
            >
              {appName}
            </Paragraph>
          </div>
          <div
            style={{
              width: "100%",
              padding: authMode === "register" ? "26px 26px 22px" : "28px 26px 22px",
              borderRadius: 28,
              background: panelBackground,
              border: panelBorder,
              boxShadow: panelShadow,
              backdropFilter: "blur(18px)",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <Title
                level={3}
                style={{
                  marginBottom: 6,
                  color: headingColor,
                  fontSize: authMode === "login" ? 26 : 24,
                }}
              >
                {authMode === "login" ? "欢迎登录" : "创建账户"}
              </Title>
              <Paragraph style={{ marginBottom: 0, color: mutedText }}>
                {authMode === "login"
                  ? "输入账号信息后继续处理项目、审批与协作。"
                  : "填写以下信息后创建账户。"}
              </Paragraph>
            </div>

            <Form
              form={form}
              layout="vertical"
              size="large"
              onFinish={handleSubmit}
              initialValues={{ username: "", password: "", displayName: "", email: "" }}
            >
              {authMode === "register" && (
                <Form.Item
                  label="姓名"
                  name="displayName"
                  rules={[{ required: true, message: "请输入姓名" }]}
                >
                  <Input
                    name="displayName"
                    autoComplete="name"
                    prefix={<UserOutlined style={{ color: fieldIconColor }} />}
                    placeholder="例如：张三"
                    allowClear
                    style={{ borderRadius: 14, height: 48 }}
                  />
                </Form.Item>
              )}
              <Form.Item
                label={authMode === "login" ? "账号 / 企业邮箱" : "账号"}
                name="username"
                rules={[{ required: true, message: "请输入账号" }]}
              >
                <Input
                  name="username"
                  autoComplete={authMode === "login" ? "username" : "username"}
                  prefix={<MailOutlined style={{ color: fieldIconColor }} />}
                  suffix={
                    <DownOutlined
                      style={{ color: fieldIconColor, fontSize: 12, opacity: 0.8 }}
                    />
                  }
                  placeholder={authMode === "login" ? "账号/企业邮箱" : "请输入登录账号"}
                  allowClear
                  style={{ borderRadius: 14, height: 48 }}
                />
              </Form.Item>
              {authMode === "register" && (
                <Form.Item
                  label="企业邮箱"
                  name="email"
                  rules={[
                    { required: true, message: "请输入企业邮箱" },
                    { type: "email", message: "请输入有效的邮箱地址" },
                  ]}
                >
                  <Input
                    name="email"
                    autoComplete="email"
                    prefix={<MailOutlined style={{ color: fieldIconColor }} />}
                    placeholder="例如：zhangsan@example.com"
                    allowClear
                    style={{ borderRadius: 14, height: 48 }}
                  />
                </Form.Item>
              )}
              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: "请输入密码" },
                  ...(authMode === "register"
                    ? [{ min: 8, message: "密码长度不能少于 8 位" }]
                    : []),
                ]}
              >
                <Input.Password
                  name="password"
                  autoComplete={
                    authMode === "login" ? "current-password" : "new-password"
                  }
                  prefix={<LockOutlined style={{ color: fieldIconColor }} />}
                  placeholder="请输入登录密码"
                  style={{ borderRadius: 14, height: 48 }}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0, marginTop: 6 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  style={{
                    height: 48,
                    borderRadius: 14,
                    fontWeight: 700,
                    background:
                      "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
                    boxShadow: primaryShadow,
                  }}
                >
                  {authMode === "login" ? "登录" : "注册"}
                </Button>
              </Form.Item>
            </Form>
          </div>

          <div
            style={{
              textAlign: "center",
              color: subtleText,
              fontSize: 14,
            }}
          >
            {authMode === "login" ? "还没有账户？" : "已有账户？"}
            <Button
              type="link"
              onClick={() => {
                setAuthMode((prev) => (prev === "login" ? "register" : "login"));
                form.resetFields();
              }}
              style={{
                paddingInline: 6,
                color: "#14b8a6",
                fontWeight: 700,
              }}
            >
              {authMode === "login" ? "注册" : "登录"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

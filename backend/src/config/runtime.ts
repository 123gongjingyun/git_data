import { join } from "path";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== "") {
      return value;
    }
  }
  return undefined;
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

export const runtimeConfig = {
  nodeEnv: readEnv("NODE_ENV", "BACKEND_NODE_ENV") || nodeEnv,
  isProduction,
  host: readEnv("HOST", "BACKEND_HOST") || "0.0.0.0",
  port: Number(readEnv("PORT", "BACKEND_PORT") || 3000),
  jwtSecret: readEnv("JWT_SECRET", "BACKEND_JWT_SECRET") || "dev-secret",
  jwtExpiresIn: readEnv("JWT_EXPIRES_IN", "BACKEND_JWT_EXPIRES_IN") || "2h",
  corsOrigins:
    readEnv("CORS_ORIGIN", "BACKEND_CORS_ORIGIN")
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) || [],
  dbType: (
    readEnv("DB_TYPE", "BACKEND_DB_TYPE") ||
    (isProduction ? "mysql" : "sqlite")
  ).toLowerCase(),
  dbHost: readEnv("DB_HOST", "BACKEND_DB_HOST") || "127.0.0.1",
  dbPort: Number(readEnv("DB_PORT", "BACKEND_DB_PORT") || 3306),
  dbUser: readEnv("DB_USER", "BACKEND_DB_USER") || "root",
  dbPassword: readEnv("DB_PASSWORD", "BACKEND_DB_PASSWORD") || "password",
  dbName: readEnv("DB_NAME", "BACKEND_DB_NAME") || "pre_sales_lifecycle",
  dbSqlitePath:
    readEnv("DB_SQLITE_PATH", "BACKEND_DB_SQLITE_PATH") ||
    join(__dirname, "..", "..", "..", "pre_sales_lifecycle.sqlite"),
  dbSynchronize: parseBoolean(
    readEnv("DB_SYNCHRONIZE", "BACKEND_DB_SYNCHRONIZE"),
    !isProduction,
  ),
  feishuAppId: readEnv("FEISHU_APP_ID", "BACKEND_FEISHU_APP_ID") || "",
  feishuAppSecret: readEnv("FEISHU_APP_SECRET", "BACKEND_FEISHU_APP_SECRET") || "",
  feishuVerificationToken:
    readEnv("FEISHU_VERIFICATION_TOKEN", "BACKEND_FEISHU_VERIFICATION_TOKEN") || "",
  feishuEncryptKey: readEnv("FEISHU_ENCRYPT_KEY", "BACKEND_FEISHU_ENCRYPT_KEY") || "",
  feishuBotName: readEnv("FEISHU_BOT_NAME", "BACKEND_FEISHU_BOT_NAME") || "售前助手",
  feishuBaseUrl:
    readEnv("FEISHU_BASE_URL", "BACKEND_FEISHU_BASE_URL") || "https://open.feishu.cn",
};

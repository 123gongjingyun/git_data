import { join } from "path";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

export const runtimeConfig = {
  nodeEnv,
  isProduction,
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "2h",
  corsOrigins:
    process.env.CORS_ORIGIN
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) || [],
  dbType: (process.env.DB_TYPE || (isProduction ? "mysql" : "sqlite")).toLowerCase(),
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "password",
  dbName: process.env.DB_NAME || "pre_sales_lifecycle",
  dbSqlitePath:
    process.env.DB_SQLITE_PATH ||
    join(__dirname, "..", "..", "..", "pre_sales_lifecycle.sqlite"),
  dbSynchronize: parseBoolean(process.env.DB_SYNCHRONIZE, !isProduction),
};

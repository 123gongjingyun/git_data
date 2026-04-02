const apiBaseUrl = (
  process.env.API_BASE_URL ||
  process.env.SMOKE_API_BASE_URL ||
  "http://127.0.0.1/api"
).replace(/\/+$/, "");

const adminUsername = process.env.SMOKE_ADMIN_USERNAME || "admin_demo";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || "Admin@123";

const ANALYTICS_MOCK_OPPORTUNITIES = [
  {
    name: "【分析种子】金融行业签约趋势-10月",
    stage: "won",
    expectedValue: "3800000.00",
    expectedCloseDate: "2025-10-18",
    probability: 100,
    description: "用于数据分析页业绩趋势的 MySQL 固定种子数据。",
  },
  {
    name: "【分析种子】制造行业签约趋势-11月",
    stage: "won",
    expectedValue: "5200000.00",
    expectedCloseDate: "2025-11-15",
    probability: 100,
    description: "用于数据分析页业绩趋势的 MySQL 固定种子数据。",
  },
  {
    name: "【分析种子】电商行业签约趋势-12月",
    stage: "won",
    expectedValue: "4600000.00",
    expectedCloseDate: "2025-12-20",
    probability: 100,
    description: "用于数据分析页业绩趋势的 MySQL 固定种子数据。",
  },
  {
    name: "【分析种子】园区行业签约趋势-1月",
    stage: "won",
    expectedValue: "6100000.00",
    expectedCloseDate: "2026-01-12",
    probability: 100,
    description: "用于数据分析页业绩趋势的 MySQL 固定种子数据。",
  },
  {
    name: "【分析种子】金融行业签约趋势-2月",
    stage: "won",
    expectedValue: "5700000.00",
    expectedCloseDate: "2026-02-14",
    probability: 100,
    description: "用于数据分析页业绩趋势的 MySQL 固定种子数据。",
  },
  {
    name: "【分析种子】制造行业签约趋势-3月",
    stage: "won",
    expectedValue: "6800000.00",
    expectedCloseDate: "2026-03-22",
    probability: 100,
    description: "用于数据分析页业绩趋势的 MySQL 固定种子数据。",
  },
];

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${path} failed: ${response.status} ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

async function main() {
  console.log(`[1/3] 登录管理员 ${adminUsername}`);
  const loginResult = await login(adminUsername, adminPassword);
  const accessToken = loginResult?.accessToken;
  if (!accessToken) {
    throw new Error("管理员登录未返回 accessToken");
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  console.log("[2/3] 读取现有商机");
  const list = await request("/opportunities?page=1&pageSize=100", {
    headers,
  });
  const existingNames = new Set(
    Array.isArray(list?.items) ? list.items.map((item) => item.name) : [],
  );

  console.log("[3/3] 写入缺失的分析趋势种子");
  let createdCount = 0;
  for (const item of ANALYTICS_MOCK_OPPORTUNITIES) {
    if (existingNames.has(item.name)) {
      continue;
    }
    await request("/opportunities", {
      method: "POST",
      headers,
      body: JSON.stringify(item),
    });
    createdCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        apiBaseUrl,
        totalSeedDefinitions: ANALYTICS_MOCK_OPPORTUNITIES.length,
        createdCount,
        skippedCount: ANALYTICS_MOCK_OPPORTUNITIES.length - createdCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Seed analytics mock opportunities failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

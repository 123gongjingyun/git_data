import fs from "node:fs/promises";
import path from "node:path";
import { loadPlaywright } from "./playwright-runtime.mjs";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const OUTPUT_PREFIX = process.env.OUTPUT_PREFIX || "local";
const LOGIN_USERNAME = process.env.LOGIN_USERNAME || "admin_demo";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "Admin@123";
const CHROME_PATH =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const outputDir = new URL("./", import.meta.url);

const targets = [
  { key: "workbench", menu: "工作台" },
  { key: "projects", menu: "项目管理" },
  { key: "opportunities", menu: "商机管理" },
  { key: "solutions", menu: "解决方案" },
  { key: "bids", menu: "投标管理" },
  { key: "contracts", menu: "合同管理" },
  { key: "knowledge", menu: "知识库" },
  {
    key: "settings-menu-permissions",
    menu: "系统设置",
    subMenu: "权限管理中心",
    ensureTexts: ["菜单权限管理"],
  },
  {
    key: "settings-action-permissions",
    menu: "系统设置",
    subMenu: "权限管理中心",
    tabLabel: "操作权限",
    ensureTexts: ["操作权限管理"],
  },
  { key: "settings-team", menu: "系统设置", subMenu: "团队管理" },
  { key: "settings-knowledge-category", menu: "系统设置", subMenu: "知识库目录管理" },
  {
    key: "settings-feishu-cards",
    menu: "系统设置",
    subMenu: "飞书集成",
    previewMode: "卡片预览",
    ensureTexts: ["飞书集成", "卡片预览"],
  },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dumpPageState(page, filename) {
  const payload = await page.evaluate(() => ({
    title: document.title,
    path: window.location.pathname,
    bodyText: (document.body?.innerText || "").slice(0, 5000),
    scrollerCount: document.querySelectorAll(".app-scrollbar").length,
    horizontalScrollerCount: Array.from(document.querySelectorAll(".app-scrollbar")).filter(
      (node) => {
        const element = /** @type {HTMLElement} */ (node);
        return element.scrollWidth > element.clientWidth + 24;
      },
    ).length,
    theme:
      document.querySelector(".app-shell")?.getAttribute("data-theme") ||
      document.body?.getAttribute("data-theme") ||
      "unknown",
  }));

  await fs.writeFile(
    path.join(new URL(".", outputDir).pathname, filename),
    JSON.stringify(payload, null, 2),
    "utf8",
  );

  return payload;
}

async function stabilizeScrollbars(page) {
  await page.addStyleTag({
    content: `
      .app-scrollbar::-webkit-scrollbar {
        width: 16px !important;
        height: 16px !important;
      }
      .app-scrollbar::-webkit-scrollbar-thumb {
        border-width: 3px !important;
      }
    `,
  });

  await page.evaluate(() => {
    document.querySelectorAll(".app-scrollbar").forEach((node) => {
      const element = /** @type {HTMLElement} */ (node);
      if (element.scrollHeight > element.clientHeight + 24) {
        element.scrollTop = Math.floor((element.scrollHeight - element.clientHeight) * 0.35);
      }
      if (element.scrollWidth > element.clientWidth + 24) {
        element.scrollLeft = Math.floor((element.scrollWidth - element.clientWidth) * 0.35);
      }
    });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
}

async function openMainMenu(page, label) {
  await page.locator(".ant-menu").getByText(label, { exact: true }).first().click();
  await page.waitForLoadState("networkidle");
  await delay(900);
}

async function openSettingsSubMenu(page, label) {
  const candidate = page.getByText(label, { exact: true }).last();
  await candidate.click();
  await delay(900);
}

async function switchPreviewMode(page, label) {
  const target = page.getByText(label, { exact: true }).last();
  await target.click();
  await delay(900);
}

async function switchTab(page, label) {
  await page.getByRole("tab", { name: label, exact: true }).click();
  await delay(900);
}

async function ensureDarkTheme(page) {
  const readTheme = async () =>
    page.evaluate(
      () =>
        document.querySelector(".app-shell")?.getAttribute("data-theme") ||
        document.body?.getAttribute("data-theme") ||
        "unknown",
    );

  let currentTheme = await readTheme();
  if (currentTheme === "dark") {
    return;
  }

  const toggle = page
    .getByRole("button", { name: /深色模式|浅色模式/ })
    .or(page.locator("button").filter({ hasText: /深色模式|浅色模式/ }).first());

  if ((await toggle.count()) === 0) {
    throw new Error(`Theme toggle button not found; current theme is ${currentTheme}`);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await toggle.first().click();
    await delay(900);
    currentTheme = await readTheme();
    if (currentTheme === "dark") {
      return;
    }
  }

  throw new Error(`Failed to switch to dark theme; current theme is ${currentTheme}`);
}

async function main() {
  const summary = [];
  const { chromium } = await loadPlaywright();

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ["--no-first-run", "--no-default-browser-check"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1180 },
  });
  const page = await context.newPage();

  try {
    await page.goto(FRONTEND_URL, { waitUntil: "networkidle", timeout: 30000 });
    await delay(1000);

    const usernameInput = page.getByPlaceholder("账号/企业邮箱").or(page.locator("input").nth(0));
    const passwordInput = page
      .getByPlaceholder("请输入登录密码")
      .or(page.locator("input[type='password']").first());

    await usernameInput.fill(LOGIN_USERNAME);
    await passwordInput.fill(LOGIN_PASSWORD);
    await page.getByRole("button", { name: /登录|登 录/ }).click();
    await page.waitForLoadState("networkidle");
    await delay(1200);

    await ensureDarkTheme(page);

    for (const target of targets) {
      await openMainMenu(page, target.menu);
      if (target.subMenu) {
        await openSettingsSubMenu(page, target.subMenu);
      }
      if (target.tabLabel) {
        await switchTab(page, target.tabLabel);
      }
      if (target.previewMode) {
        await switchPreviewMode(page, target.previewMode);
      }
      if (target.ensureTexts?.length) {
        for (const text of target.ensureTexts) {
          await page.getByText(text, { exact: true }).first().waitFor({ timeout: 15000 });
        }
      }

      await stabilizeScrollbars(page);
      const state = await dumpPageState(page, `${OUTPUT_PREFIX}-${target.key}.json`);
      const screenshotPath = path.join(
        new URL(".", outputDir).pathname,
        `${OUTPUT_PREFIX}-${target.key}.png`,
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });

      summary.push({
        key: target.key,
        menu: target.menu,
        subMenu: target.subMenu || null,
        previewMode: target.previewMode || null,
        theme: state.theme,
        scrollerCount: state.scrollerCount,
        horizontalScrollerCount: state.horizontalScrollerCount,
        includesMenuText: state.bodyText.includes(target.subMenu || target.menu),
        includesEnsureTexts: (target.ensureTexts || []).every((text) => state.bodyText.includes(text)),
      });
    }

    await fs.writeFile(
      path.join(new URL(".", outputDir).pathname, `${OUTPUT_PREFIX}-scrollbar-summary.json`),
      JSON.stringify({ frontendUrl: FRONTEND_URL, summary }, null, 2),
      "utf8",
    );
  } finally {
    await browser.close();
  }
}

main().catch(async (error) => {
  await fs.writeFile(
    path.join(new URL(".", outputDir).pathname, `${OUTPUT_PREFIX}-scrollbar-summary.json`),
    JSON.stringify(
      {
        frontendUrl: FRONTEND_URL,
        fatalError: {
          message: error.message,
          stack: error.stack || "",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  console.error(error);
  process.exit(1);
});

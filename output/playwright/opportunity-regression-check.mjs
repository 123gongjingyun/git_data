import fs from "node:fs/promises";
import { loadPlaywright } from "./playwright-runtime.mjs";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";
const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TARGET_OPPORTUNITY_CODE = process.env.TARGET_OPPORTUNITY_CODE || "OPP-000001";
const EXPECTED_APPROVAL_STATUS_TEXT =
  process.env.EXPECTED_APPROVAL_STATUS_TEXT || "已批准";
const EXPECTED_FLOW_MARKERS = (
  process.env.EXPECTED_FLOW_MARKERS ||
  [
    "线索确认",
    "已上传",
    "销售领导审批",
    "已通过",
    "解决方案领导审批",
    "分配解决方案负责人",
    "需求分析",
    "最终审批",
  ].join("||")
)
  .split("||")
  .map((item) => item.trim())
  .filter(Boolean);
const EXPECTED_OWNER_TEXT =
  process.env.EXPECTED_OWNER_TEXT || "当前负责人：示例售前工程师";
const EXPECTED_RESEARCH_DOC_TEXT =
  process.env.EXPECTED_RESEARCH_DOC_TEXT || "当前文档：某银行_需求调研纪要_v1.0.docx";
const EXPECTED_FINAL_COMMENT_TEXT =
  process.env.EXPECTED_FINAL_COMMENT_TEXT || "最终审批通过，商机推进条件满足";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dumpState(page, label) {
  const payload = await page.evaluate(() => {
    const text = document.body?.innerText || "";
    const buttons = Array.from(document.querySelectorAll("button"))
      .map((button) => button.textContent?.trim())
      .filter(Boolean)
      .slice(0, 30);
    const inputs = Array.from(
      document.querySelectorAll("input, textarea, [contenteditable='true']"),
    ).map((element) => ({
      tag: element.tagName,
      type: element.getAttribute("type"),
      placeholder: element.getAttribute("placeholder"),
      ariaLabel: element.getAttribute("aria-label"),
    }));
    return {
      title: document.title,
      text: text.slice(0, 4000),
      buttons,
      inputs,
      path: window.location.pathname,
      hash: window.location.hash,
    };
  });

  await fs.writeFile(
    new URL(`./${label}.json`, import.meta.url),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
}

async function main() {
  const consoleEvents = [];
  const pageErrors = [];
  const requestFailures = [];
  const { chromium } = await loadPlaywright();
  const summary = {
    loginSucceeded: false,
    navigatedToOpportunities: false,
    approvalModalOpened: false,
    opportunityListShowsApproved: false,
    approvalModalShowsCompletedFlow: false,
    approvalModalShowsOwnerAndResearchDoc: false,
    approvalModalShowsFinalComment: false,
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ["--no-first-run", "--no-default-browser-check"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    consoleEvents.push({
      type: message.type(),
      text: message.text(),
    });
  });
  page.on("pageerror", (error) => {
    pageErrors.push({
      message: error.message,
      stack: error.stack || "",
    });
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      failure: request.failure()?.errorText || "unknown",
    });
  });

  try {
    await page.goto(FRONTEND_URL, { waitUntil: "networkidle", timeout: 30000 });
    await delay(1000);
    await dumpState(page, "01-landing");
    await page.screenshot({
      path: new URL("./01-landing.png", import.meta.url).pathname,
      fullPage: true,
    });

    const usernameInput =
      page.getByPlaceholder("请输入用户名").or(
        page.locator("input").nth(0),
      );
    const passwordInput =
      page.getByPlaceholder("请输入密码").or(
        page.locator("input[type='password']").first(),
      );

    await usernameInput.fill("zhangsan_sales");
    await passwordInput.fill("Sales@123");
    await page.getByRole("button", { name: /登录|登 录/ }).click();
    await page.waitForLoadState("networkidle");
    await delay(1200);
    await dumpState(page, "02-after-login");
    await page.screenshot({
      path: new URL("./02-after-login.png", import.meta.url).pathname,
      fullPage: true,
    });

    summary.loginSucceeded = /商机管理|工作台|解决方案|数据分析/.test(
      await page.locator("body").innerText(),
    );

    const opportunitiesEntry = page.getByText("商机管理", { exact: true });
    await opportunitiesEntry.click();
    await delay(1600);
    await page.waitForLoadState("networkidle");
    await dumpState(page, "03-opportunities");
    await page.screenshot({
      path: new URL("./03-opportunities.png", import.meta.url).pathname,
      fullPage: true,
    });

    const bodyText = await page.locator("body").innerText();
    summary.navigatedToOpportunities = bodyText.includes("商机管理");
    summary.opportunityListShowsApproved =
      bodyText.includes(TARGET_OPPORTUNITY_CODE) &&
      bodyText.includes(EXPECTED_APPROVAL_STATUS_TEXT);

    const approvalButton = page
      .getByRole("button", { name: /审批|上传需求说明|查看审批/ })
      .first();
    await approvalButton.click();
    await delay(1200);
    await dumpState(page, "04-approval-modal");
    await page.screenshot({
      path: new URL("./04-approval-modal.png", import.meta.url).pathname,
      fullPage: true,
    });

    const modalText = await page.locator("body").innerText();
    summary.approvalModalOpened =
      modalText.includes("审批") ||
      modalText.includes("上传需求说明") ||
      modalText.includes("审批流程");
    summary.approvalModalShowsCompletedFlow = EXPECTED_FLOW_MARKERS.every((marker) =>
      modalText.includes(marker),
    );
    summary.approvalModalShowsOwnerAndResearchDoc =
      modalText.includes(EXPECTED_OWNER_TEXT) &&
      modalText.includes(EXPECTED_RESEARCH_DOC_TEXT);
    summary.approvalModalShowsFinalComment =
      modalText.includes(EXPECTED_FINAL_COMMENT_TEXT);
  } finally {
    await fs.writeFile(
      new URL("./opportunity-regression-report.json", import.meta.url),
      JSON.stringify(
        {
          summary,
          consoleEvents,
          pageErrors,
          requestFailures,
        },
        null,
        2,
      ),
      "utf8",
    );
    await browser.close();
  }
}

main().catch(async (error) => {
  await fs.writeFile(
    new URL("./opportunity-regression-report.json", import.meta.url),
    JSON.stringify(
      {
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

const test = require("node:test");
const assert = require("node:assert/strict");

require("reflect-metadata");

process.env.BACKEND_OPENCLAW_SHARED_TOKEN = "openclaw-unit-token";

const {
  OpenClawService,
} = require("../dist/integrations/openclaw/openclaw.service.js");

function createRepository(initialItems = []) {
  const items = initialItems.map((item) => ({ ...item }));

  const matchesWhere = (item, where = {}) =>
    Object.entries(where).every(([key, expected]) => item[key] === expected);

  return {
    items,
    async findOne(options = {}) {
      const where = options.where || {};
      return items.find((item) => matchesWhere(item, where)) || null;
    },
  };
}

function createService(overrides = {}) {
  const feishuService = {
    async getPendingApprovals(actor, query) {
      if (overrides.getPendingApprovals) {
        return overrides.getPendingApprovals(actor, query);
      }
      return { items: [], total: 0, requestId: "pending-default" };
    },
    async getOpportunitySummary(code, actor) {
      if (overrides.getOpportunitySummary) {
        return overrides.getOpportunitySummary(code, actor);
      }
      return { code, owner: actor.username };
    },
    async getSolutionSummary(code, actor) {
      if (overrides.getSolutionSummary) {
        return overrides.getSolutionSummary(code, actor);
      }
      return { code, owner: actor.username };
    },
    async getDailyBrief(actor) {
      if (overrides.getDailyBrief) {
        return overrides.getDailyBrief(actor);
      }
      return { date: "2026-04-05", userId: actor.id };
    },
  };

  const userRepo = createRepository(
    overrides.users || [
      {
        id: 2,
        username: "manager_demo",
        role: "manager",
        isActive: true,
        allowedMenuKeys: [],
        deniedMenuKeys: [],
        allowedActionKeys: [],
        deniedActionKeys: [],
        mainIndustry: ["金融"],
      },
    ],
  );
  const bindingRepo = createRepository(
    overrides.bindings || [
      {
        id: 1,
        feishuOpenId: "ou_manager",
        platformUserId: 2,
        status: "active",
        platformUser: {
          id: 2,
          username: "manager_demo",
          role: "manager",
          isActive: true,
        },
      },
    ],
  );

  return new OpenClawService(feishuService, userRepo, bindingRepo);
}

test("executeSkill resolves actor from active Feishu binding for pending approvals", async () => {
  const service = createService({
    async getPendingApprovals(actor, query) {
      assert.equal(actor.id, 2);
      assert.equal(actor.username, "manager_demo");
      assert.equal(query.limit, 3);
      assert.equal(query.businessType, "opportunity");
      return { items: [{ businessCode: "OPP-000001" }], total: 1, requestId: "req-1" };
    },
  });

  const result = await service.executeSkill("get_my_pending_approvals", {
    feishuOpenId: "ou_manager",
    input: {
      limit: 3,
      businessType: "opportunity",
    },
  });

  assert.equal(result.skillName, "get_my_pending_approvals");
  assert.equal(result.actor.platformUserId, 2);
  assert.equal(result.result.total, 1);
});

test("executeSkill rejects mismatched platform user and binding context", async () => {
  const service = createService();

  await assert.rejects(
    service.executeSkill("get_daily_brief", {
      platformUserId: 99,
      feishuOpenId: "ou_manager",
    }),
    /平台用户与飞书绑定不一致/,
  );
});

test("query maps pending approval intent to readonly skill", async () => {
  const service = createService({
    async getPendingApprovals() {
      return { items: [], total: 0, requestId: "req-pending" };
    },
  });

  const result = await service.query({
    platformUserId: 2,
    queryText: "我今天有哪些待审批？",
  });

  assert.equal(result.intent.skillName, "get_my_pending_approvals");
  assert.equal(result.intent.reason, "matched_pending_keywords");
  assert.equal(result.result.total, 0);
});

test("query maps business code to summary skill", async () => {
  const service = createService({
    async getOpportunitySummary(code) {
      return { code, name: "教育云升级项目" };
    },
  });

  const result = await service.query({
    platformUserId: 2,
    queryText: "帮我看下商机摘要 OPP-000123",
  });

  assert.equal(result.intent.skillName, "get_opportunity_summary");
  assert.equal(result.result.code, "OPP-000123");
});

test("executeSkill accepts direct top-level code payload for opportunity summary", async () => {
  const service = createService({
    async getOpportunitySummary(code, actor) {
      assert.equal(code, "OPP-000123");
      assert.equal(actor.id, 2);
      return { code, owner: actor.username };
    },
  });

  const result = await service.executeSkill("get_opportunity_summary", {
    platformUserId: 2,
    code: "OPP-000123",
  });

  assert.equal(result.result.code, "OPP-000123");
  assert.equal(result.result.owner, "manager_demo");
});

test("executeSkill accepts top-level limit and businessType payload for pending approvals", async () => {
  const service = createService({
    async getPendingApprovals(actor, query) {
      assert.equal(actor.id, 2);
      assert.equal(query.limit, 5);
      assert.equal(query.businessType, "solution");
      return { items: [], total: 0, requestId: "req-direct-pending" };
    },
  });

  const result = await service.executeSkill("get_my_pending_approvals", {
    platformUserId: 2,
    limit: 5,
    businessType: "solution",
  });

  assert.equal(result.skillName, "get_my_pending_approvals");
  assert.equal(result.result.requestId, "req-direct-pending");
});

test("query rejects write intents for readonly OpenClaw integration", async () => {
  const service = createService();

  await assert.rejects(
    service.query({
      platformUserId: 2,
      queryText: "帮我审批通过 OPP-000123",
    }),
    /OPENCLAW_READONLY_ONLY/,
  );
});

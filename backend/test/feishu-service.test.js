const test = require("node:test");
const assert = require("node:assert/strict");

process.env.BACKEND_FEISHU_VERIFICATION_TOKEN = "unit-test-token";
process.env.BACKEND_FEISHU_ENCRYPT_KEY = "";

require("reflect-metadata");

const { FeishuService } = require("../dist/integrations/feishu/feishu.service.js");

function createRepository(initialItems = []) {
  let nextId =
    initialItems.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const items = initialItems.map((item) => ({ ...item }));

  const matchesWhere = (item, where = {}) =>
    Object.entries(where).every(([key, expected]) => item[key] === expected);

  return {
    items,
    create(input) {
      return { ...input };
    },
    async save(entity) {
      const record = entity;
      if (!record.id) {
        record.id = nextId++;
      }
      const index = items.findIndex((item) => item.id === record.id);
      if (index >= 0) {
        items[index] = record;
      } else {
        items.push(record);
      }
      return record;
    },
    async findOne(options = {}) {
      const where = options.where || {};
      const order = options.order || {};
      const matched = items.filter((item) => matchesWhere(item, where));
      if (matched.length === 0) {
        return null;
      }
      if (order.id === "DESC") {
        matched.sort((left, right) => Number(right.id) - Number(left.id));
      }
      return matched[0];
    },
    async find(options = {}) {
      const where = options.where;
      if (!where) {
        return [...items];
      }
      if (Array.isArray(where)) {
        return items.filter((item) => where.some((entry) => matchesWhere(item, entry)));
      }
      return items.filter((item) => matchesWhere(item, where));
    },
    async count() {
      return items.length;
    },
  };
}

function createApprovalsService(overrides = {}) {
  return {
    async findOne() {
      if (overrides.findOne) {
        return overrides.findOne(...arguments);
      }
      return {
        businessType: "opportunity",
        businessId: 10,
        status: "in_progress",
        currentNode: { nodeName: "最终审批" },
        canCurrentUserHandleCurrentNode: true,
      };
    },
    async executeAction() {
      if (overrides.executeAction) {
        return overrides.executeAction(...arguments);
      }
      return {
        status: "approved",
        currentNode: { nodeName: "已完成" },
      };
    },
  };
}

function createService(options = {}) {
  const callbackRepo = createRepository();
  const messageRepo = createRepository();
  const bindingRepo = createRepository(options.bindings || []);
  const userRepo = createRepository(options.users || []);
  const opportunityRepo = createRepository(options.opportunities || []);
  const solutionRepo = createRepository(options.solutions || []);
  const approvalInstanceRepo = createRepository(options.approvalInstances || []);
  const approvalsService = createApprovalsService(options.approvalsService || {});

  const service = new FeishuService(
    approvalsService,
    callbackRepo,
    messageRepo,
    bindingRepo,
    userRepo,
    opportunityRepo,
    solutionRepo,
    approvalInstanceRepo,
  );

  return {
    service,
    approvalsService,
    callbackRepo,
    messageRepo,
    bindingRepo,
    userRepo,
    opportunityRepo,
    solutionRepo,
    approvalInstanceRepo,
  };
}

function findButton(card, label) {
  return card.body.elements.find(
    (element) =>
      element &&
      element.tag === "button" &&
      element.text &&
      element.text.content === label,
  );
}

test("handleEventCallback returns challenge after verification token check", async () => {
  const { service, callbackRepo } = createService();

  const result = await service.handleEventCallback({
    challenge: "challenge-token",
    token: "unit-test-token",
  });

  assert.deepEqual(result, { challenge: "challenge-token" });
  assert.equal(callbackRepo.items.length, 1);
  assert.equal(callbackRepo.items[0].status, "processed");
  assert.deepEqual(callbackRepo.items[0].resultJson, { challenge: "challenge-token" });
});

test("handleEventCallback rejects mismatched verification token", async () => {
  const { service, callbackRepo } = createService();

  await assert.rejects(
    service.handleEventCallback({
      challenge: "challenge-token",
      token: "wrong-token",
    }),
    /飞书事件 token 校验失败/,
  );

  assert.equal(callbackRepo.items.length, 1);
  assert.equal(callbackRepo.items[0].status, "failed");
  assert.match(callbackRepo.items[0].errorMessage, /token 校验失败/);
});

test("handleCardAction returns stale-card warning and raw JSON 2.0 card for expired instances", async () => {
  const { service, callbackRepo, messageRepo } = createService({
    bindings: [
      {
        id: 1,
        feishuOpenId: "ou_test_manager",
        platformUserId: 2,
        platformUsername: "manager_demo",
        status: "active",
        platformUser: {
          id: 2,
          username: "manager_demo",
          role: "manager",
        },
      },
    ],
    approvalInstances: [
      {
        id: 20,
        businessType: "opportunity",
        businessId: 10,
        status: "approved",
        currentNodeId: null,
        nodes: [],
      },
    ],
    opportunities: [
      {
        id: 10,
        name: "教育云升级项目",
        stage: "proposal",
        expectedValue: "680万",
        approvalOpinion: "已完成审批",
        customer: { name: "省教育厅" },
        owner: { username: "sales_demo", displayName: "李四" },
      },
    ],
  });

  const result = await service.handleCardAction({
    open_id: "ou_test_manager",
    token: "action-stale-1",
    action: {
      value: {
        action: "approve",
        approvalInstanceId: 20,
        businessType: "opportunity",
        businessId: 10,
      },
    },
  });

  assert.equal(result.toast.type, "warning");
  assert.match(result.toast.content, /当前卡片已失效/);
  assert.equal(result.card.type, "raw");
  assert.equal(result.card.data.schema, "2.0");
  assert.equal(result.card.data.config.update_multi, true);
  assert.equal(callbackRepo.items[0].status, "ignored");
  assert.equal(messageRepo.items[0].templateKey, "card_action_stale");

  const approveButton = findButton(result.card.data, "通过");
  const rejectButton = findButton(result.card.data, "驳回");
  assert.equal(approveButton.disabled, true);
  assert.equal(rejectButton.disabled, true);
});

test("handleCardAction returns warning card when current user can no longer handle the node", async () => {
  const { service, callbackRepo, messageRepo } = createService({
    bindings: [
      {
        id: 1,
        feishuOpenId: "ou_test_manager",
        platformUserId: 2,
        platformUsername: "manager_demo",
        status: "active",
        platformUser: {
          id: 2,
          username: "manager_demo",
          role: "manager",
        },
      },
    ],
    approvalInstances: [
      {
        id: 21,
        businessType: "opportunity",
        businessId: 10,
        status: "in_progress",
        currentNodeId: 201,
        nodes: [{ id: 201, nodeNameSnapshot: "最终审批" }],
      },
    ],
    opportunities: [
      {
        id: 10,
        name: "教育云升级项目",
        stage: "proposal",
        expectedValue: "680万",
        approvalOpinion: "其他审批人已处理",
        customer: { name: "省教育厅" },
        owner: { username: "sales_demo", displayName: "李四" },
      },
    ],
    approvalsService: {
      async findOne() {
        return {
          businessType: "opportunity",
          businessId: 10,
          status: "in_progress",
          currentNode: { nodeName: "最终审批" },
          canCurrentUserHandleCurrentNode: false,
        };
      },
    },
  });

  const result = await service.handleCardAction({
    open_id: "ou_test_manager",
    token: "action-forbidden-1",
    action: {
      value: {
        action: "approve",
        approvalInstanceId: 21,
        businessType: "opportunity",
        businessId: 10,
      },
    },
  });

  assert.equal(result.toast.type, "warning");
  assert.match(result.toast.content, /已由其他审批人处理|不是你的可操作节点/);
  assert.equal(result.card.type, "raw");
  assert.equal(result.card.data.schema, "2.0");
  assert.equal(callbackRepo.items[0].status, "ignored");
  assert.equal(messageRepo.items[0].templateKey, "card_action_forbidden");

  const approveButton = findButton(result.card.data, "通过");
  const rejectButton = findButton(result.card.data, "驳回");
  assert.equal(approveButton.disabled, true);
  assert.equal(rejectButton.disabled, true);
});

test("handleCardAction returns success with raw JSON 2.0 card after approval", async () => {
  let findOneCalls = 0;
  const { service, callbackRepo, messageRepo } = createService({
    bindings: [
      {
        id: 1,
        feishuOpenId: "ou_test_admin",
        platformUserId: 1,
        platformUsername: "admin_demo",
        status: "active",
        platformUser: {
          id: 1,
          username: "admin_demo",
          role: "admin",
        },
      },
    ],
    approvalInstances: [
      {
        id: 22,
        businessType: "opportunity",
        businessId: 10,
        status: "in_progress",
        currentNodeId: 301,
        nodes: [{ id: 301, nodeNameSnapshot: "最终审批" }],
      },
    ],
    opportunities: [
      {
        id: 10,
        name: "教育云升级项目",
        stage: "proposal",
        expectedValue: "680万",
        approvalOpinion: "建议通过",
        customer: { name: "省教育厅" },
        owner: { username: "sales_demo", displayName: "李四" },
      },
    ],
    approvalsService: {
      async findOne() {
        findOneCalls += 1;
        if (findOneCalls === 1) {
          return {
            businessType: "opportunity",
            businessId: 10,
            status: "in_progress",
            currentNode: { nodeName: "最终审批" },
            canCurrentUserHandleCurrentNode: true,
          };
        }
        return {
          businessType: "opportunity",
          businessId: 10,
          status: "approved",
          currentNode: { nodeName: "已完成" },
          canCurrentUserHandleCurrentNode: false,
        };
      },
      async executeAction() {
        return {
          status: "approved",
          currentNode: { nodeName: "已完成" },
        };
      },
    },
  });

  const result = await service.handleCardAction({
    open_id: "ou_test_admin",
    token: "action-success-1",
    action: {
      value: {
        action: "approve",
        approvalInstanceId: 22,
        businessType: "opportunity",
        businessId: 10,
      },
    },
  });

  assert.equal(result.toast.type, "success");
  assert.match(result.toast.content, /审批已通过/);
  assert.equal(result.card.type, "raw");
  assert.equal(result.card.data.schema, "2.0");
  assert.equal(result.card.data.config.update_multi, true);
  assert.equal(callbackRepo.items[0].status, "processed");
  assert.equal(messageRepo.items[0].templateKey, "card_action_approve");

  const approveButton = findButton(result.card.data, "通过");
  const rejectButton = findButton(result.card.data, "驳回");
  assert.equal(approveButton.disabled, true);
  assert.equal(rejectButton.disabled, true);
});

test("handleCardAction returns duplicate warning for repeated action token", async () => {
  const { service, callbackRepo, messageRepo } = createService({
    bindings: [
      {
        id: 1,
        feishuOpenId: "ou_test_admin",
        platformUserId: 1,
        platformUsername: "admin_demo",
        status: "active",
        platformUser: {
          id: 1,
          username: "admin_demo",
          role: "admin",
        },
      },
    ],
    opportunities: [
      {
        id: 10,
        name: "教育云升级项目",
        stage: "proposal",
        expectedValue: "680万",
        approvalOpinion: "建议通过",
        customer: { name: "省教育厅" },
        owner: { username: "sales_demo", displayName: "李四" },
      },
    ],
    approvalInstances: [
      {
        id: 23,
        businessType: "opportunity",
        businessId: 10,
        status: "in_progress",
        currentNodeId: 301,
        nodes: [{ id: 301, nodeNameSnapshot: "最终审批" }],
      },
    ],
    approvalsService: {
      async findOne() {
        return {
          businessType: "opportunity",
          businessId: 10,
          status: "approved",
          currentNode: { nodeName: "已完成" },
          canCurrentUserHandleCurrentNode: false,
        };
      },
    },
  });

  callbackRepo.items.push({
    id: 99,
    callbackType: "card_action",
    actionToken: "duplicate-token-1",
    status: "processed",
  });

  const result = await service.handleCardAction({
    open_id: "ou_test_admin",
    token: "duplicate-token-1",
    action: {
      value: {
        action: "approve",
        approvalInstanceId: 23,
        businessType: "opportunity",
        businessId: 10,
      },
    },
  });

  assert.equal(result.toast.type, "warning");
  assert.match(result.toast.content, /已处理/);
  assert.equal(callbackRepo.items.at(-1).status, "ignored");
  assert.equal(messageRepo.items.at(-1).templateKey, "card_action_duplicate");
});

test("handleCardAction returns success toast for open_detail without approval execution", async () => {
  let executeActionCalled = false;
  const { service, callbackRepo, messageRepo } = createService({
    bindings: [
      {
        id: 1,
        feishuOpenId: "ou_test_admin",
        platformUserId: 1,
        platformUsername: "admin_demo",
        status: "active",
        platformUser: {
          id: 1,
          username: "admin_demo",
          role: "admin",
        },
      },
    ],
    approvalsService: {
      async executeAction() {
        executeActionCalled = true;
        throw new Error("should not be called");
      },
    },
  });

  const result = await service.handleCardAction({
    open_id: "ou_test_admin",
    token: "open-detail-1",
    action: {
      value: {
        action: "open_detail",
        approvalInstanceId: 23,
        businessType: "opportunity",
        businessId: 10,
      },
    },
  });

  assert.equal(result.toast.type, "success");
  assert.match(result.toast.content, /平台中继续处理详情/);
  assert.equal(executeActionCalled, false);
  assert.equal(callbackRepo.items[0].status, "processed");
  assert.equal(messageRepo.items[0].templateKey, "card_action_open_detail");
});

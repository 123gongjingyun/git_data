export type PlaygroundIntent = {
  skillName: string;
  arguments?: Record<string, unknown>;
  reason?: string;
};

export type PlaygroundSkillName =
  | "get_my_pending_approvals"
  | "get_opportunity_summary"
  | "get_solution_summary"
  | "get_daily_brief";

export type PlaygroundSkillSchema = {
  type: string;
  required?: string[];
  properties?: Record<
    string,
    {
      type?: string;
      minimum?: number;
      maximum?: number;
      pattern?: string;
      enum?: string[];
    }
  >;
};

export type PlaygroundSkillDefinition = {
  name: PlaygroundSkillName;
  description: string;
  readonly: boolean;
  inputSchema: PlaygroundSkillSchema;
};

export type PlaygroundSkillCatalogResponse = {
  items: PlaygroundSkillDefinition[];
  total: number;
};

export type PlaygroundActor = {
  platformUserId?: number;
  username?: string;
  role?: string;
  feishuOpenId?: string;
};

export type PlaygroundResponse = {
  requestId: string;
  queryText: string;
  intent: PlaygroundIntent;
  actor: PlaygroundActor;
  result: Record<string, unknown>;
};

export type PlaygroundErrorResponse = {
  message?: string;
  error?: string;
  statusCode?: number;
};

export type RequestSnapshot =
  | {
      kind: "success";
      payload: PlaygroundResponse;
    }
  | {
      kind: "blocked";
      payload: PlaygroundErrorResponse;
    }
  | {
      kind: "error";
      payload: string;
    };

export type RequestRecord = {
  id: string;
  queryText: string;
  skillName: string;
  requestedAt: string;
  outcome: "success" | "error" | "blocked";
  responseTitle: string;
  responseDetail: string;
  snapshot: RequestSnapshot;
};

export type HistoryFilter = "all" | RequestRecord["outcome"];

export type SuccessInsight = {
  kind: "business_empty" | "payload_incomplete";
  title: string;
  accent: string;
  suggestions: string[];
};

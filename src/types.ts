export type ErrorInput = {
  message?: string;
  status?: number | null;
  source?: string | null;
  exception_type?: string | null;
  code?: string | null;
  raw?: unknown;
  context?: {
    run_id?: string;
    tool?: string;
    attempt?: number;
    [key: string]: unknown;
  };
};

export type MatchRule = {
  status?: number | number[];
  message_contains?: string[];
  message_regex?: string;
  exception_type?: string | string[];
  code?: string | string[];
  source?: string | string[];
};

export type CategoryDef = {
  description?: string;
  match: MatchRule[];
};

export type Taxonomy = {
  categories: Record<string, CategoryDef>;
};

export type StrategyAction = "retry" | "wait" | "escalate";

export type StrategyDef = {
  action: StrategyAction;
  wait_seconds?: number;
  max_attempts?: number;
  backoff?: "fixed" | "exponential";
  reason?: string;
};

export type Strategies = {
  default_max_attempts?: number;
  strategies: Record<string, StrategyDef>;
};

export type ClassifyResult = {
  category: string;
  confidence: "high" | "medium" | "low";
  matched_on: string[];
  description?: string;
};

export type HandleResult = {
  category: string;
  action: StrategyAction;
  wait_seconds: number;
  max_attempts: number;
  attempt: number;
  should_retry: boolean;
  escalate: boolean;
  reason: string;
  instructions: string;
  matched_on: string[];
};

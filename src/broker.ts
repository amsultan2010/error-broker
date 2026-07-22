import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { classify } from "./classify.js";
import type {
  ClassifyResult,
  ErrorInput,
  HandleResult,
  Strategies,
  StrategyDef,
  Taxonomy,
} from "./types.js";

type AttemptKey = string;

export type ErrorBrokerOptions = {
  taxonomy: Taxonomy;
  strategies: Strategies;
  escalateLogPath?: string;
};

function attemptKey(error: ErrorInput, category: string): AttemptKey {
  const runId = error.context?.run_id ?? "default";
  const tool = error.context?.tool ?? "default";
  return `${runId}::${tool}::${category}`;
}

function computeWait(
  strategy: StrategyDef,
  attempt: number,
): number {
  const base = strategy.wait_seconds ?? 0;
  if (strategy.backoff === "exponential" && attempt > 1) {
    return Math.min(base * 2 ** (attempt - 1), 300);
  }
  return base;
}

function buildInstructions(result: Omit<HandleResult, "instructions">): string {
  if (result.escalate || result.action === "escalate") {
    return `ESCALATE [${result.category}]: ${result.reason} Do not keep retrying.`;
  }
  if (result.should_retry) {
    return (
      `RETRY [${result.category}]: wait ${result.wait_seconds}s, ` +
      `then retry (attempt ${result.attempt}/${result.max_attempts}). ${result.reason}`
    );
  }
  if (result.action === "wait") {
    return `WAIT [${result.category}]: wait ${result.wait_seconds}s. ${result.reason}`;
  }
  return `${result.action.toUpperCase()} [${result.category}]: ${result.reason}`;
}

/**
 * ErrorBroker classifies errors and returns recovery advice.
 * Advise-first: callers (agents or code) follow the returned instructions.
 */
export class ErrorBroker {
  private taxonomy: Taxonomy;
  private strategies: Strategies;
  private escalateLogPath?: string;
  private attempts = new Map<AttemptKey, number>();

  constructor(options: ErrorBrokerOptions) {
    this.taxonomy = options.taxonomy;
    this.strategies = options.strategies;
    this.escalateLogPath = options.escalateLogPath;
  }

  classify(error: ErrorInput): ClassifyResult {
    return classify(error, this.taxonomy);
  }

  listCategories(): Array<{ name: string; description?: string }> {
    return Object.entries(this.taxonomy.categories).map(([name, def]) => ({
      name,
      description: def.description,
    }));
  }

  listStrategies(): Array<{ category: string; strategy: StrategyDef }> {
    return Object.entries(this.strategies.strategies).map(
      ([category, strategy]) => ({ category, strategy }),
    );
  }

  resetAttempts(runId?: string): void {
    if (!runId) {
      this.attempts.clear();
      return;
    }
    for (const key of this.attempts.keys()) {
      if (key.startsWith(`${runId}::`)) this.attempts.delete(key);
    }
  }

  handle(error: ErrorInput): HandleResult {
    const classified = this.classify(error);
    const category = classified.category;
    const strategy =
      this.strategies.strategies[category] ??
      this.strategies.strategies.unknown ?? {
        action: "escalate" as const,
        max_attempts: 1,
        reason: "No strategy configured.",
      };

    const key = attemptKey(error, category);
    const prior = this.attempts.get(key) ?? 0;
    const explicitAttempt = error.context?.attempt;
    const attempt =
      typeof explicitAttempt === "number" && explicitAttempt > 0
        ? explicitAttempt
        : prior + 1;
    this.attempts.set(key, attempt);

    const maxAttempts =
      strategy.max_attempts ??
      this.strategies.default_max_attempts ??
      3;

    const exhausted = attempt >= maxAttempts;
    const escalate =
      strategy.action === "escalate" || exhausted;

    const wait_seconds = escalate ? 0 : computeWait(strategy, attempt);
    const should_retry =
      !escalate &&
      (strategy.action === "retry" || strategy.action === "wait");

    const reason =
      exhausted && strategy.action !== "escalate"
        ? `Max attempts (${maxAttempts}) reached for ${category}. Escalating.`
        : strategy.reason ?? `Strategy for ${category}`;

    const base = {
      category,
      action: escalate ? ("escalate" as const) : strategy.action,
      wait_seconds,
      max_attempts: maxAttempts,
      attempt,
      should_retry,
      escalate,
      reason,
      matched_on: classified.matched_on,
    };

    const result: HandleResult = {
      ...base,
      instructions: buildInstructions(base),
    };

    if (result.escalate) {
      this.logEscalation(error, result);
    }

    return result;
  }

  private logEscalation(error: ErrorInput, result: HandleResult): void {
    const path = this.escalateLogPath;
    if (!path) return;
    try {
      mkdirSync(dirname(path), { recursive: true });
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        category: result.category,
        reason: result.reason,
        error,
        result,
      });
      appendFileSync(path, line + "\n", "utf8");
    } catch {
      // Logging must never break handling.
    }
  }
}

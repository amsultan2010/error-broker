import { ErrorBroker } from "./broker.js";
import { loadConfig } from "./config.js";
import { classify } from "./classify.js";
import { DEFAULT_STRATEGIES, DEFAULT_TAXONOMY } from "./defaults.js";
import type {
  ClassifyResult,
  ErrorInput,
  HandleResult,
  Strategies,
  Taxonomy,
} from "./types.js";

export { ErrorBroker, loadConfig, classify, DEFAULT_TAXONOMY, DEFAULT_STRATEGIES };
export type {
  ClassifyResult,
  ErrorInput,
  HandleResult,
  Strategies,
  Taxonomy,
};

export type CreateBrokerOptions = {
  taxonomyPath?: string;
  strategiesPath?: string;
  configDir?: string;
  escalateLogPath?: string;
};

/** Create a broker with built-in defaults, or optional YAML overrides. */
export function createBroker(options?: CreateBrokerOptions): ErrorBroker {
  const config = loadConfig(options);
  return new ErrorBroker(config);
}

/** One-shot classify using defaults (or optional config). */
export function classifyError(
  error: ErrorInput,
  options?: CreateBrokerOptions,
): ClassifyResult {
  return createBroker(options).classify(error);
}

/** One-shot handle using defaults (or optional config). */
export function handle(
  error: ErrorInput,
  options?: CreateBrokerOptions,
): HandleResult {
  return createBroker(options).handle(error);
}

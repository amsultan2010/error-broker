import type { Strategies, Taxonomy } from "./types.js";

/** Built-in taxonomy. Works with zero config. */
export const DEFAULT_TAXONOMY: Taxonomy = {
  categories: {
    rate_limit: {
      description: "Provider or API rate limit hit",
      match: [
        { status: 429 },
        {
          message_contains: [
            "rate limit",
            "rate_limit",
            "too many requests",
            "requests per minute",
            "rpm limit",
            "tpm limit",
          ],
        },
        { code: ["rate_limit_exceeded", "rate_limit_error", "too_many_requests"] },
      ],
    },
    quota: {
      description: "Billing, credits, or usage quota exhausted",
      match: [
        { status: 402 },
        {
          message_contains: [
            "insufficient_quota",
            "insufficient credits",
            "quota exceeded",
            "billing",
            "payment required",
            "credit balance",
            "usage limit",
          ],
        },
        { code: ["insufficient_quota", "billing_not_active", "credit_balance_too_low"] },
      ],
    },
    auth: {
      description: "Authentication or authorization failure",
      match: [
        { status: [401, 403] },
        {
          message_contains: [
            "unauthorized",
            "invalid api key",
            "invalid_api_key",
            "authentication",
            "expired token",
            "access denied",
            "permission denied",
            "forbidden",
          ],
        },
        { code: ["invalid_api_key", "authentication_error", "permission_denied"] },
        {
          exception_type: [
            "AuthenticationError",
            "PermissionError",
            "UnauthorizedError",
          ],
        },
      ],
    },
    timeout: {
      description: "Request or tool timed out",
      match: [
        { status: [408, 504] },
        {
          message_contains: [
            "timed out",
            "timeout",
            "deadline exceeded",
            "context deadline",
          ],
        },
        { code: ["timeout", "request_timeout"] },
        {
          exception_type: [
            "TimeoutError",
            "AbortError",
          ],
        },
      ],
    },
    network: {
      description: "Network or connectivity failure",
      match: [
        { status: [502, 503] },
        {
          message_contains: [
            "econnreset",
            "econnrefused",
            "enotfound",
            "network error",
            "socket hang up",
            "fetch failed",
            "connection reset",
            "dns",
          ],
        },
        {
          exception_type: [
            "FetchError",
            "NetworkError",
            "ConnectTimeoutError",
          ],
        },
      ],
    },
    overloaded: {
      description: "Upstream service temporarily overloaded",
      match: [
        { status: 529 },
        {
          message_contains: [
            "overloaded",
            "capacity",
            "temporarily unavailable",
            "high demand",
          ],
        },
        { code: ["overloaded_error", "server_overloaded"] },
      ],
    },
    context_overflow: {
      description: "Prompt or context window exceeded",
      match: [
        {
          message_contains: [
            "context length",
            "context_length",
            "maximum context",
            "token limit",
            "too many tokens",
            "context window",
            "prompt is too long",
            "max_tokens",
          ],
        },
        {
          code: [
            "context_length_exceeded",
            "max_tokens",
            "prompt_too_long",
          ],
        },
      ],
    },
    invalid_response: {
      description: "Malformed or unparseable model/tool response",
      match: [
        {
          message_contains: [
            "unexpected token",
            "invalid json",
            "json parse",
            "malformed",
            "parse error",
            "syntaxerror",
            "not valid json",
            "unexpected end of json",
          ],
        },
        {
          exception_type: [
            "SyntaxError",
            "JSONDecodeError",
            "ValidationError",
            "ZodError",
          ],
        },
      ],
    },
    not_found: {
      description: "Resource, model, or path not found",
      match: [
        { status: 404 },
        {
          message_contains: [
            "not found",
            "does not exist",
            "no such file",
            "enoent",
            "model_not_found",
          ],
        },
        { code: ["not_found", "model_not_found"] },
      ],
    },
    tool_failure: {
      description: "Tool or MCP call failed",
      match: [
        {
          message_contains: [
            "tool error",
            "tool failed",
            "mcp error",
            "tool call failed",
          ],
        },
        { source: ["tool", "mcp"] },
      ],
    },
    unknown: {
      description: "Unrecognized error",
      match: [],
    },
  },
};

/** Built-in strategies. Works with zero config. */
export const DEFAULT_STRATEGIES: Strategies = {
  default_max_attempts: 3,
  strategies: {
    rate_limit: {
      action: "retry",
      wait_seconds: 60,
      max_attempts: 3,
      backoff: "exponential",
      reason: "Rate limited. Wait, then retry.",
    },
    quota: {
      action: "escalate",
      max_attempts: 1,
      reason: "Quota or billing issue. Do not retry. Notify a human.",
    },
    auth: {
      action: "escalate",
      max_attempts: 1,
      reason: "Auth failed. Fix credentials before retrying.",
    },
    timeout: {
      action: "retry",
      wait_seconds: 5,
      max_attempts: 3,
      backoff: "exponential",
      reason: "Timed out. Retry with backoff.",
    },
    network: {
      action: "retry",
      wait_seconds: 3,
      max_attempts: 3,
      backoff: "exponential",
      reason: "Network error. Retry with backoff.",
    },
    overloaded: {
      action: "retry",
      wait_seconds: 15,
      max_attempts: 4,
      backoff: "exponential",
      reason: "Upstream overloaded. Wait, then retry.",
    },
    context_overflow: {
      action: "escalate",
      max_attempts: 1,
      reason:
        "Context too large. Compress or trim context before retrying. Do not blind-retry.",
    },
    invalid_response: {
      action: "retry",
      wait_seconds: 1,
      max_attempts: 2,
      backoff: "fixed",
      reason: "Bad response shape. Retry once with stricter parsing or prompting.",
    },
    not_found: {
      action: "escalate",
      max_attempts: 1,
      reason: "Resource not found. Fix the path, model, or id. Do not retry blindly.",
    },
    tool_failure: {
      action: "retry",
      wait_seconds: 2,
      max_attempts: 2,
      backoff: "fixed",
      reason: "Tool failed. Retry once, then escalate.",
    },
    unknown: {
      action: "retry",
      wait_seconds: 2,
      max_attempts: 2,
      backoff: "fixed",
      reason: "Unknown error. Limited retry, then escalate.",
    },
  },
};

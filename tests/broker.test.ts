import { describe, expect, it } from "vitest";
import { createBroker, classifyError, handle } from "../src/index.js";

describe("classify", () => {
  it("classifies 429 as rate_limit", () => {
    const result = classifyError({
      status: 429,
      message: "Too many requests",
    });
    expect(result.category).toBe("rate_limit");
    expect(result.confidence).toBe("high");
  });

  it("classifies invalid api key as auth", () => {
    const result = classifyError({
      status: 401,
      message: "Invalid API key provided",
    });
    expect(result.category).toBe("auth");
  });

  it("classifies context overflow from message", () => {
    const result = classifyError({
      message: "This model's maximum context length was exceeded",
    });
    expect(result.category).toBe("context_overflow");
  });

  it("classifies JSON parse failures", () => {
    const result = classifyError({
      message: "Unexpected token < in JSON at position 0",
      exception_type: "SyntaxError",
    });
    expect(result.category).toBe("invalid_response");
  });

  it("falls back to unknown", () => {
    const result = classifyError({ message: "something weird happened" });
    expect(result.category).toBe("unknown");
    expect(result.confidence).toBe("low");
  });

  it("prefers quota over generic billing-ish rate messages via status 402", () => {
    const result = classifyError({
      status: 402,
      message: "Payment required",
    });
    expect(result.category).toBe("quota");
  });
});

describe("handle", () => {
  it("advises retry with wait for rate limits", () => {
    const result = handle({
      status: 429,
      message: "rate limit",
      context: { run_id: "run-a", tool: "openai" },
    });
    expect(result.category).toBe("rate_limit");
    expect(result.should_retry).toBe(true);
    expect(result.wait_seconds).toBeGreaterThan(0);
    expect(result.escalate).toBe(false);
    expect(result.instructions).toContain("RETRY");
  });

  it("escalates auth immediately", () => {
    const result = handle({
      status: 401,
      message: "unauthorized",
      context: { run_id: "run-b" },
    });
    expect(result.category).toBe("auth");
    expect(result.escalate).toBe(true);
    expect(result.should_retry).toBe(false);
  });

  it("escalates after max attempts", () => {
    const broker = createBroker();
    const error = {
      status: 429,
      message: "rate limit",
      context: { run_id: "run-c", tool: "chat" },
    };

    const first = broker.handle(error);
    const second = broker.handle(error);
    const third = broker.handle(error);

    expect(first.attempt).toBe(1);
    expect(second.attempt).toBe(2);
    expect(third.attempt).toBe(3);
    expect(third.escalate).toBe(true);
    expect(third.should_retry).toBe(false);
  });

  it("uses exponential backoff", () => {
    const broker = createBroker();
    const error = {
      status: 429,
      message: "rate limit",
      context: { run_id: "run-d", tool: "api" },
    };
    const a1 = broker.handle(error);
    const a2 = broker.handle(error);
    expect(a2.wait_seconds).toBeGreaterThan(a1.wait_seconds);
  });
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createBroker } from "./index.js";
import type { ErrorInput } from "./types.js";

const errorInputSchema = z.object({
  message: z.string().optional(),
  status: z.number().nullable().optional(),
  source: z.string().nullable().optional(),
  exception_type: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  raw: z.unknown().optional(),
  context: z
    .object({
      run_id: z.string().optional(),
      tool: z.string().optional(),
      attempt: z.number().optional(),
    })
    .passthrough()
    .optional(),
});

function textResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export async function startMcpServer(options?: {
  configDir?: string;
  escalateLogPath?: string;
}): Promise<void> {
  const broker = createBroker(options);

  const server = new McpServer({
    name: "error-broker",
    version: "0.1.0",
  });

  server.tool(
    "classify_error",
    "Classify a raw error into a structured category (rate_limit, auth, timeout, etc).",
    {
      error: errorInputSchema.describe(
        "Normalized error object with message, status, source, etc.",
      ),
    },
    async ({ error }) => textResult(broker.classify(error as ErrorInput)),
  );

  server.tool(
    "handle_error",
    "Classify an error and return recovery advice (wait/retry/escalate) for the agent to follow.",
    {
      error: errorInputSchema.describe(
        "Normalized error object. Include context.run_id so repeat failures escalate correctly.",
      ),
    },
    async ({ error }) => textResult(broker.handle(error as ErrorInput)),
  );

  server.tool(
    "list_categories",
    "List all error categories in the current taxonomy.",
    {},
    async () => textResult(broker.listCategories()),
  );

  server.tool(
    "list_strategies",
    "List recovery strategies mapped to each error category.",
    {},
    async () => textResult(broker.listStrategies()),
  );

  server.tool(
    "reset_attempts",
    "Clear per-run failure counters. Call when starting a fresh agent run.",
    {
      run_id: z
        .string()
        .optional()
        .describe("If set, only clear attempts for this run_id"),
    },
    async ({ run_id }) => {
      broker.resetAttempts(run_id);
      return textResult({ ok: true, cleared: run_id ?? "all" });
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

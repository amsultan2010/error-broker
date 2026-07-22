#!/usr/bin/env node
import { createBroker } from "./index.js";
import type { ErrorInput } from "./types.js";
import { startMcpServer } from "./mcp-server.js";

function printHelp(): void {
  console.log(`error-broker — classify agent errors and get recovery advice

Usage:
  error-broker classify '<json>'
  error-broker handle '<json>'
  error-broker categories
  error-broker strategies
  error-broker mcp
  error-broker version
  error-broker help

Examples:
  error-broker classify '{"status":429,"message":"Rate limit exceeded"}'
  error-broker handle '{"status":401,"message":"Invalid API key","context":{"run_id":"1"}}'

Options:
  --config-dir <path>   Load taxonomy.yaml and strategies.yaml from a directory
  --escalate-log <path> Append escalations to a JSONL log file

MCP:
  Add to Cursor ~/.cursor/mcp.json or .cursor/mcp.json:

  {
    "mcpServers": {
      "error-broker": {
        "command": "npx",
        "args": ["-y", "github:amsultan2010/error-broker", "mcp"]
      }
    }
  }
`);
}

function parseArgs(argv: string[]) {
  const args = [...argv];
  let configDir: string | undefined;
  let escalateLogPath: string | undefined;
  const positional: string[] = [];

  while (args.length) {
    const a = args.shift()!;
    if (a === "--config-dir") {
      configDir = args.shift();
    } else if (a === "--escalate-log") {
      escalateLogPath = args.shift();
    } else if (a === "--help" || a === "-h") {
      positional.push("help");
    } else {
      positional.push(a);
    }
  }

  return { configDir, escalateLogPath, positional };
}

function parseErrorJson(raw: string | undefined): ErrorInput {
  if (!raw) {
    throw new Error("Missing JSON error payload");
  }
  const parsed = JSON.parse(raw) as ErrorInput;
  return parsed;
}

async function main(): Promise<void> {
  const { configDir, escalateLogPath, positional } = parseArgs(
    process.argv.slice(2),
  );
  const command = positional[0] ?? "help";

  if (command === "help") {
    printHelp();
    return;
  }

  if (command === "version") {
    console.log("0.1.0");
    return;
  }

  if (command === "mcp") {
    await startMcpServer({ configDir, escalateLogPath });
    return;
  }

  const broker = createBroker({ configDir, escalateLogPath });

  if (command === "categories") {
    console.log(JSON.stringify(broker.listCategories(), null, 2));
    return;
  }

  if (command === "strategies") {
    console.log(JSON.stringify(broker.listStrategies(), null, 2));
    return;
  }

  if (command === "classify") {
    const error = parseErrorJson(positional[1]);
    console.log(JSON.stringify(broker.classify(error), null, 2));
    return;
  }

  if (command === "handle") {
    const error = parseErrorJson(positional[1]);
    console.log(JSON.stringify(broker.handle(error), null, 2));
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

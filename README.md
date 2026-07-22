# error-broker

Classify agent errors and get a clear recovery action.

Agents hit rate limits, auth failures, timeouts, and bad JSON all the time. Most stacks treat every failure the same. error-broker maps the raw error to a category and tells you what to do next: wait and retry, or stop and escalate.

Free and open source (MIT). No account. No API key.

## Why it helps

- Same rules for Cursor agents, scripts, and app code
- Useful defaults out of the box
- Optional YAML if you want custom categories or strategies
- MCP tools so agents can call it directly
- Repeat failures escalate instead of looping forever

## Install (Cursor MCP)

Add this to `.cursor/mcp.json` or `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "error-broker": {
      "command": "npx",
      "args": ["-y", "github:amsultan2010/error-broker", "mcp"]
    }
  }
}
```

Reload Cursor. The agent gets tools like `handle_error` and `classify_error`.

If you clone this repo locally, you can point Cursor at the built CLI instead:

```json
{
  "mcpServers": {
    "error-broker": {
      "command": "node",
      "args": ["/absolute/path/to/error-broker/dist/cli.js", "mcp"]
    }
  }
}
```

## Install (npm)

```bash
npm i error-broker
```

```js
import { handle, classifyError, createBroker } from "error-broker";

const decision = handle({
  status: 429,
  message: "Rate limit exceeded",
  context: { run_id: "job-1", tool: "openai" },
});

console.log(decision.instructions);
// RETRY [rate_limit]: wait 60s, then retry (attempt 1/3). ...
```

## CLI

```bash
npx error-broker classify '{"status":429,"message":"Rate limit exceeded"}'
npx error-broker handle '{"status":401,"message":"Invalid API key"}'
npx error-broker categories
npx error-broker strategies
```

## What you get back

`handle` returns JSON like:

```json
{
  "category": "rate_limit",
  "action": "retry",
  "wait_seconds": 60,
  "max_attempts": 3,
  "attempt": 1,
  "should_retry": true,
  "escalate": false,
  "reason": "Rate limited. Wait, then retry.",
  "instructions": "RETRY [rate_limit]: wait 60s, then retry (attempt 1/3). Rate limited. Wait, then retry."
}
```

Pass the same `context.run_id` on later failures so attempt counting and escalation work.

## Default categories

rate_limit, quota, auth, timeout, network, overloaded, context_overflow, invalid_response, not_found, tool_failure, unknown

## Custom config (optional)

```bash
npx error-broker handle --config-dir ./my-config '{"status":429,"message":"slow down"}'
```

Put `taxonomy.yaml` and `strategies.yaml` in that folder. Examples live in `defaults/`.

## MCP tools

- `classify_error`: map an error to a category
- `handle_error`: classify plus recovery advice
- `list_categories`: show taxonomy
- `list_strategies`: show recovery rules
- `reset_attempts`: clear counters for a run

## Development

```bash
npm install
npm test
npm run build
node dist/cli.js classify '{"status":429,"message":"rate limit"}'
```

## License

MIT. See [LICENSE](LICENSE).

---
name: use-error-broker
description: When an API, tool, or agent step fails, classify it with error-broker and follow the recovery advice instead of guessing.
---

# Use error-broker on failures

When a tool call, HTTP request, model call, or script fails:

1. Call the `handle_error` MCP tool (or `classify_error` if you only need the category).
2. Pass a normalized payload:
   - `message`
   - `status` if you have an HTTP status
   - `source` (openai, anthropic, tool name, etc.)
   - `exception_type` if known
   - `context.run_id` so repeat failures escalate correctly
3. Follow the returned `instructions`:
   - If `should_retry` is true, wait `wait_seconds`, then retry.
   - If `escalate` is true, stop retrying and tell the user clearly.
4. Do not invent your own retry policy when error-broker already returned one.

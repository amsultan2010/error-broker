/**
 * Minimal SDK usage example.
 *
 * Run after build:
 *   node examples/sdk-usage.mjs
 */
import { createBroker, handle, classifyError } from "../dist/index.js";

const classified = classifyError({
  status: 429,
  message: "Rate limit exceeded",
  source: "openai",
});
console.log("classify:", classified);

const decision = handle({
  status: 429,
  message: "Rate limit exceeded",
  context: { run_id: "demo-run", tool: "chat" },
});
console.log("handle:", decision);

const broker = createBroker();
console.log("categories:", broker.listCategories().map((c) => c.name).join(", "));

#!/usr/bin/env node
import { startMcpServer } from "./mcp-server.js";

startMcpServer().catch((err) => {
  console.error(err);
  process.exit(1);
});

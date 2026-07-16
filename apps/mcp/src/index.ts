import "./env";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server";

/**
 * Punto de entrada del servidor MCP de ReadHub.
 * Usa transporte STDIO: lo consume un cliente MCP (Claude Desktop, Claude Code
 * o el MCP Inspector). Los logs van a stderr para no interferir con el
 * protocolo JSON-RPC que viaja por stdout.
 */
async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[readhub-mcp] Servidor MCP iniciado (STDIO).");
}

main().catch((err) => {
  console.error("[readhub-mcp] Error fatal:", err);
  process.exit(1);
});

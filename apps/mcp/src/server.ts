import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerTools } from "./tools/index";
import { registerResources } from "./resources/index";
import { registerPrompts } from "./prompts/index";

/**
 * Construye el servidor MCP de ReadHub y registra Tools, Resources y Prompts.
 * Toda la lógica se delega a los paquetes compartidos del monorepo
 * (@readhub/shared, @readhub/database, @readhub/ai): el servidor no duplica
 * lógica de negocio.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "readhub-mcp",
    version: "0.1.0",
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}

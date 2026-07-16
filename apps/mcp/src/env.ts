import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Carga las variables de entorno. Prioriza las ya presentes en process.env
 * (p. ej. inyectadas por el cliente MCP / Claude Desktop). Como respaldo para
 * desarrollo local, lee el .env.local de la app web del monorepo.
 */
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../web/.env.local") });

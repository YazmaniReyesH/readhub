# @readhub/mcp — Servidor MCP de ReadHub

Servidor [Model Context Protocol](https://modelcontextprotocol.io) que expone las
capacidades de ReadHub (búsqueda, RAG, artículos) a clientes MCP como Claude
Desktop, Claude Code o el MCP Inspector. Reutiliza los paquetes compartidos del
monorepo (`@readhub/shared`, `@readhub/database`, `@readhub/ai`) — no duplica
lógica de negocio.

Transporte: **STDIO**.

## Capacidades

**Tools:** `buscar_articulos`, `listar_articulos`, `obtener_articulo`,
`buscar_semantica`, `responder_pregunta`, `comparar_articulos`,
`extraer_temas_clave`, `construir_contexto_investigacion`.

**Resources:** `readhub://info`, `readhub://articles`, `readhub://article/{id}`,
`readhub://authors`, `readhub://categories`, `readhub://stats`.

**Prompts:** `resumir_articulo`, `explicar_articulo`, `comparar_articulos`,
`generar_preguntas`, `extraer_conceptos_clave`.

## Requisitos

Las claves de IA y Supabase se leen de `apps/web/.env.local` (VOYAGE_API_KEY,
ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). El
servidor las carga automáticamente desde ahí.

## Ejecutar

```bash
# Desde la raíz del monorepo
npm run dev:mcp        # tsx watch (desarrollo)
# o
npm run start -w @readhub/mcp
```

### Probar con el MCP Inspector

```bash
npx @modelcontextprotocol/inspector node --import tsx apps/mcp/src/index.ts
```

### Conectar a Claude Desktop

Ubicación del archivo `claude_desktop_config.json`:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json` (o, en la versión de la
  Microsoft Store, dentro de `...\Packages\Claude_*\LocalCache\Roaming\Claude\`).
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`.

Configuración recomendada (**rutas absolutas**, la más robusta):

```json
{
  "mcpServers": {
    "readhub": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "--import",
        "file:///C:/ruta/a/readhub/node_modules/tsx/dist/loader.mjs",
        "C:/ruta/a/readhub/apps/mcp/src/index.ts"
      ],
      "cwd": "C:/ruta/a/readhub/apps/mcp"
    }
  }
}
```

Ajusta `C:/ruta/a/readhub` a la ubicación real del repositorio. En macOS/Linux usa
las rutas equivalentes (`command: "node"` suele bastar, y el loader estaría en
`node_modules/tsx/dist/loader.mjs`).

> Tras editar la config, **cierra Claude Desktop por completo** (clic derecho en el
> ícono de la bandeja del sistema → Salir) y vuelve a abrirlo.

### Notas / solución de problemas

> El servidor escribe sus logs en `stderr` para no interferir con el protocolo
> JSON-RPC, que viaja por `stdout`. **STDOUT debe contener únicamente JSON-RPC**;
> cualquier otra salida rompe la conexión.

- **`Cannot find package 'tsx'`** (servidor desconectado): Claude Desktop en Windows
  no aplica el `cwd`, así que `node --import tsx` no encuentra el paquete. Por eso se
  usan **rutas absolutas** al loader de tsx y al script (como arriba), en vez del
  `--import tsx` relativo.
- **`Unexpected token '◇' ... is not valid JSON`**: lo causaba el mensaje "injected
  env" de dotenv v17 escrito en STDOUT. Se resolvió con `quiet: true` al cargar el
  `.env.local` (ver `src/env.ts`).
- **Logs de diagnóstico de Claude Desktop:** `...\Claude\logs\mcp-server-readhub.log`.

## Arquitectura

```
Cliente MCP (Claude Desktop / Inspector)
        │  STDIO (JSON-RPC)
        ▼
apps/mcp  →  Tools / Resources / Prompts
        │
        ▼
@readhub/shared · @readhub/database · @readhub/ai   (paquetes compartidos)
        │
        ▼
Supabase (pgvector) · Voyage (embeddings) · Claude (LLM)
```

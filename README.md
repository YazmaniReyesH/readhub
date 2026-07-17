# ReadHub (monorepo)

Plataforma SaaS de lectura/escritura con asistente de conocimiento (RAG) y un
servidor **MCP** que expone sus capacidades a clientes como Claude Desktop.

Este repositorio evoluciona a lo largo de la especialización. **Estado actual:
Etapa 5 — MCP + monorepo.**

## Estructura

```
readhub/
├── apps/
│   ├── web/          Aplicación Next.js 15 (la plataforma ReadHub)
│   └── mcp/          Servidor MCP (Model Context Protocol) de ReadHub
├── packages/
│   ├── types/        (@readhub/types)    Tipos del dominio y de la BD
│   ├── config/       (@readhub/config)   Constantes y lectura de env
│   ├── database/     (@readhub/database) Cliente admin de Supabase + acceso a datos
│   ├── ai/           (@readhub/ai)       Embeddings (Voyage), prompts y LLM (Claude)
│   └── shared/       (@readhub/shared)   Servicios RAG (embedding, búsqueda, contexto, chat)
├── skills/
│   └── asistente-del-escritor/   Skill de Claude que usa el servidor MCP
├── turbo.json        Orquestación (Turborepo)
└── tsconfig.base.json
```

## Requisitos

- Node.js 18.18+ · npm 11+
- Proyecto de Supabase (con pgvector) y claves de Voyage AI y Anthropic.

## Puesta en marcha

```bash
npm install                       # instala todo el workspace
# Configura apps/web/.env.local (ver apps/web/.env.example)

npm run dev:web                   # web en http://localhost:3000
npm run dev:mcp                   # servidor MCP (STDIO)

npm run build                     # build de todo el monorepo (turbo)
npm run lint                      # lint
```

Scripts de base de datos (desde `apps/web`): `db:migrate`, `db:seed`, `db:test`,
`db:setup`, `db:backfill`.

## Testing y CI/CD

```bash
npm run type-check    # tsc --noEmit en todos los workspaces
npm run lint          # ESLint
npm run test          # Vitest (unitarias) — validators, RAG (mocks), utils
npm run test:e2e      # Playwright (apps/web/e2e) — flujo de autenticación
```

- **Vitest**: pruebas de lógica pura y de negocio (no componentes visuales).
- **Playwright**: E2E del flujo de autenticación con patrón Page Object
  (`apps/web/e2e/`). Localmente corre contra tu Supabase; en CI contra un
  Supabase **local efímero**.
- **CI** (`.github/workflows/ci.yml`, GitHub Actions): job de type-check + lint +
  Vitest y job de Playwright. Corre en Pull Requests y push a `main`.
  **No despliega y no requiere secretos**: las unitarias usan mocks y el E2E
  levanta Supabase local dentro del runner (sus claves son públicas y efímeras).

## Documentación

- Arquitectura del monorepo: [`CLAUDE.md`](CLAUDE.md)
- Web + RAG: [`apps/web/docs/ARCHITECTURE.md`](apps/web/docs/ARCHITECTURE.md)
- Servidor MCP: [`apps/mcp/README.md`](apps/mcp/README.md)
- Skills de Claude: [`skills/`](skills/)

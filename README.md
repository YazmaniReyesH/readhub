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
- **Rendimiento**: en CI se construye el build de producción, se verifica el
  presupuesto de bundle y se auditan Core Web Vitals con **Lighthouse**. Ver
  [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md).

### Flujo del pipeline (`.github/workflows/ci.yml`)

Se dispara en Pull Requests y en push a `main`. Las etapas corren en cadena; si
una falla, las siguientes no se ejecutan:

```
checks (type-check + lint + Vitest)
      └─► e2e (Playwright vs Supabase local efímero)
            └─► performance (build + gate de bundle + Lighthouse/CWV, artefacto de reporte)
                  └─► deploy (Vercel: producción en push a main, preview en PR)
```

- Las validaciones (`checks`, `e2e`, `performance`) **no requieren secretos**:
  usan mocks, un Supabase efímero y un build local con páginas públicas.
- Solo el `deploy` usa secretos de Vercel; si no están configurados, se **omite**
  sin fallar. Configúralo con la guía [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Variables de entorno

- **App (local):** `apps/web/.env.local` (ver `apps/web/.env.example`).
- **Despliegue (Vercel):** las mismas variables de la app se definen en el
  proyecto de Vercel; GitHub solo necesita `VERCEL_TOKEN`, `VERCEL_ORG_ID` y
  `VERCEL_PROJECT_ID`. Detalle en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Documentación

- Arquitectura del monorepo: [`CLAUDE.md`](CLAUDE.md)
- Rendimiento y Core Web Vitals: [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)
- Despliegue en Vercel (paso a paso): [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Web + RAG: [`apps/web/docs/ARCHITECTURE.md`](apps/web/docs/ARCHITECTURE.md)
- Servidor MCP: [`apps/mcp/README.md`](apps/mcp/README.md)
- Skills de Claude: [`skills/`](skills/)

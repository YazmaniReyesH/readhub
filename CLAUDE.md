# CLAUDE.md — Guía de arquitectura de ReadHub

Fuente de verdad de la arquitectura del monorepo. Si otra documentación (o una
skill) contradice esto, este archivo tiene prioridad.

## Monorepo

npm workspaces + Turborepo. Raíces permitidas: `apps/`, `packages/`, `supabase/`.
Todo lo demás vive en archivos individuales en la raíz.

```
apps/
  web/     Next.js 15 (App Router) — la plataforma ReadHub
  mcp/     Servidor MCP (STDIO), se ejecuta con tsx
packages/
  types/     (@readhub/types)    Tipos del dominio y de la BD
  config/    (@readhub/config)   Constantes, lectura de env, helpers puros
  database/  (@readhub/database) Cliente admin de Supabase + acceso a datos (Node)
  ai/        (@readhub/ai)       Embeddings (Voyage), prompts y llamada al LLM (Claude)
  shared/    (@readhub/shared)   Servicios RAG: embedding, vector-search, context-builder, chat
supabase/    Migraciones (fuente de verdad del esquema), policies, seed, tests RLS
skills/      Skills de Claude del proyecto
```

Cada package expone un **barrel** `.` → `src/index.ts`. Se importa por nombre de
package: `import { buildContext } from "@readhub/shared"`.

## Stack

Next.js 15 · React 19 · TypeScript · TailwindCSS v4 · Shadcn/UI (base-ui) ·
Supabase (PostgreSQL + Auth + Storage + RLS + pgvector) · **Voyage AI** (embeddings
`voyage-3.5`, **1024 dim**) · **Claude** (`claude-opus-4-8`).

## Capas (web)

```
components/  solo presentación — sin fetching ni llamadas a Supabase/IA
hooks/       estado/orquestación de cliente — llaman a services
services/    lógica de negocio — única capa que habla con Supabase (cliente navegador)
@readhub/*   lógica compartida y reutilizable (RAG, IA, acceso admin, tipos)
```

- Un componente que necesita datos llama a un **hook**; el hook llama a un **service**.
- La IA (embeddings/LLM) solo vive en `@readhub/ai`; nada más llama a Voyage/Anthropic directo.
- El cliente de Supabase se obtiene de factories: navegador (`@readhub/database` client),
  admin/service-role (`@readhub/database` `admin.ts`, **solo servidor**), o Next
  (`apps/web/lib/supabase/{server,middleware}.ts`). No crear clientes ad hoc.
- `admin.ts` (service role, evade RLS) nunca en código `"use client"`.

## Route Handlers (apps/web/app/api)

Solo para lo que el navegador no puede hacer: secretos/IA (`POST /api/chat`,
`POST /api/search`), service-role e indexado (`POST /api/index`). El CRUD ordinario
va por RLS + cliente de navegador vía hooks/services.

## Pipeline RAG (orden fijo)

```
Embedding (Voyage) → Vector Search (RPC match_articles) → Context Builder (puro) → Completion (Claude)
```

- `@readhub/ai/embeddings.embedText` genera el embedding (1024 dim, `input_type` query/document).
- `@readhub/shared/vector-search.service.searchArticles` ejecuta la RPC `match_articles` (índice HNSW, coseno).
- `@readhub/shared/context-builder.service.buildContext` es **puro** (sin I/O): selecciona, ordena, limita y arma el prompt + fuentes.
- `@readhub/ai/completion` habla con Claude (streaming o texto completo).
- La indexación fluye: publicar → `requestArticleIndex` (cliente) → `POST /api/index` → `@readhub/shared/embedding.service.indexArticle` (extrae texto TXT/PDF, embebe, guarda, deriva resumen).

## Base de datos

`supabase/migrations/*.sql` es la fuente de verdad; `supabase/schema.sql` y
`policies.sql` son copias de referencia (mantener en sync). RLS activa en todas
las tablas; `match_articles` es `SECURITY DEFINER` y solo expone artículos públicos.

## Comandos

```
npm run dev:web / dev:mcp     # desarrollo
npm run build                 # turbo build (web + mcp)
npm run type-check            # tsc --noEmit en todos los workspaces
npm run lint                  # ESLint
npm run test                  # Vitest (unitarias) en todos los workspaces
npm run test:e2e              # Playwright (apps/web/e2e)
# BD (desde apps/web): db:migrate, db:seed, db:test, db:setup, db:backfill
```

## Testing

- **Vitest** (unitarias): lógica pura y de negocio — validators, `context-builder`,
  `vector-search` (con mocks de Supabase/Voyage), `deriveSummary`, utils. No se
  prueban componentes puramente visuales.
- **Playwright** (E2E): flujos de usuario (autenticación) en `apps/web/e2e` con
  patrón Page Object. En CI corre contra un Supabase **local** efímero.
- **CI/CD**: `.github/workflows/ci.yml` (GitHub Actions), en cadena:
  `checks` (type-check + lint + Vitest) → `e2e` (Playwright) → `performance`
  (build + gate de bundle + Lighthouse/CWV) → `deploy` (Vercel: producción en
  push a `main`, preview en PR). Las validaciones no requieren secretos; solo el
  deploy usa secretos de Vercel y se omite si faltan. Ver `docs/PERFORMANCE.md` y
  `docs/DEPLOYMENT.md`.

## Notas

- El fork de Next.js puede tener cambios; ante dudas de APIs de Next, revisar
  `node_modules/next/dist/docs/` (ver `apps/web/AGENTS.md`).
- Claves de IA/Supabase: solo en `apps/web/.env.local` (ver `.env.example`), nunca commiteadas.

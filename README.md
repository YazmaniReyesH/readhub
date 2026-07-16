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

## Documentación

- Web + RAG: [`apps/web/docs/ARCHITECTURE.md`](apps/web/docs/ARCHITECTURE.md)
- Servidor MCP: [`apps/mcp/README.md`](apps/mcp/README.md)
- Skill del escritor: [`skills/asistente-del-escritor/SKILL.md`](skills/asistente-del-escritor/SKILL.md)

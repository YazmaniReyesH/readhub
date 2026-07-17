---
name: readhub-architecture-enforcer
description: Gate de arquitectura para el monorepo ReadHub — invocar ANTES de crear un archivo nuevo, mover código entre apps/packages, agregar una llamada a Supabase, agregar una llamada a IA (Voyage/Claude), o crear un componente/hook/service/tool MCP. Activar con "agrega una página/ruta", "crea un componente que consulte datos", "agrega un service", "llama a la IA/embeddings", "crea un cliente de Supabase", "agrega una tool de MCP", o cualquier creación de archivo en apps/ o packages/.
---

# ReadHub Architecture Enforcer

Filtro previo a escribir código (no un linter de estilo). Verifica **dónde vive
el código** y **qué puede depender de qué**. Si una verificación falla, corregir
la ubicación antes de continuar. La fuente de verdad es `CLAUDE.md` (prioridad).

## 1. Límites del monorepo

Raíces permitidas: `apps/`, `packages/`, `supabase/`. El resto son archivos
sueltos en la raíz.

- Nunca crear `src/`, `backend/`, `frontend/` ni un `api/` a nivel raíz.
- No inventar `packages/*` nuevos sin razón: primero revisar los existentes
  (`types`, `config`, `database`, `ai`, `shared`).
- Solo crear una app nueva si el usuario lo pide (así se creó `apps/mcp`).
- Cada package expone un **barrel** `.` → `src/index.ts`; se importa por nombre
  (`@readhub/shared`, `@readhub/config`), no por ruta interna de archivo.

## 2. Enrutamiento de Next.js (apps/web)

- Solo App Router (`apps/web/app/`). Nunca `pages/`.
- Ante dudas de APIs de Next, revisar `node_modules/next/dist/docs/` (ver `AGENTS.md`).
- Route Handlers (`apps/web/app/api/*`) solo para lo que el navegador no puede
  hacer: secretos/IA (`/api/chat`, `/api/search`) y service-role/indexado
  (`/api/index`). El CRUD ordinario va por RLS + cliente de navegador vía hooks/services.

## 3. Capas: Componente → Hook → Service → Base de datos / IA

```
apps/web/components/  solo presentación — sin fetching, sin Supabase/IA directos
apps/web/hooks/       estado/orquestación — llaman a services
apps/web/services/    lógica de negocio del cliente — hablan con Supabase (cliente navegador)
packages/shared/      servicios RAG reutilizables (embedding, vector-search, context-builder, chat)
packages/database/    factories de cliente Supabase + acceso a datos (Node)
```

- Un componente que necesita datos llama a un hook; el hook a un service.
- `packages/*` son TS puro: sin JSX, sin React, sin `"use client"`.
- Los services devuelven datos planos (nunca JSX).

## 4. La IA solo vive en packages/ai

- Nunca llamar a Voyage/Anthropic (ni `fetch` crudo a un endpoint de IA) desde un
  componente, hook, Route Handler o `apps/mcp`. Solo `packages/ai/src/{embeddings,completion,prompts}.ts`.
- Cadena: Componente → Hook → Service → `@readhub/ai`. Un Route Handler puede
  ubicarse entre Hook y Service (sección 2), pero igual llama a `@readhub/ai`.
- Embeddings con Voyage (`voyage-3.5`, 1024 dim); LLM con Claude (`claude-opus-4-8`).

## 5. Acceso a base de datos

- No instanciar clientes de Supabase ad hoc. Reutilizar factories de
  `@readhub/database` (navegador `client`, service-role `admin`) o, para Next,
  `apps/web/lib/supabase/{server,middleware}.ts`.
- `admin` (service role, evade RLS) nunca en `"use client"`.
- `supabase/migrations/*.sql` es la fuente de verdad; actualizar también las
  copias `schema.sql`/`policies.sql`.

## 6. Servidor MCP (apps/mcp)

- La lógica del protocolo MCP (tools/resources/prompts, transporte STDIO) solo en `apps/mcp`.
- `apps/mcp` es un segundo consumidor de `packages/*`: nunca importa de `apps/web` ni viceversa.
- `apps/mcp` se ejecuta con `tsx` (no Next): sin `transpilePackages` ni supuestos de Next.

## Checklist previo a escribir código

1. ¿Va en `apps/` o `packages/` (existente, no una raíz nueva)?
2. Si es UI: ¿evita importar data-fetching/Supabase/IA?
3. Si es hook: ¿solo estado y delega en un service?
4. Si es lógica de negocio: ¿en `packages/shared` o `apps/web/services`, sin JSX?
5. Si toca IA: ¿solo en `packages/ai`, y el resto llega vía Service → (Route Handler) → `@readhub/ai`?
6. Si toca Supabase: ¿reutiliza factories en vez de crear un cliente?
7. Si es MCP: ¿solo dentro de `apps/mcp`?

Si alguna respuesta es "no", corregir la ubicación antes de escribir el código.

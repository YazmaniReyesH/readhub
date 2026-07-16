# ReadHub

Plataforma SaaS de lectura y escritura (estilo Medium/Dev.to): los usuarios se
registran, publican artículos (documento + imagen de portada) y consumen el
contenido de otros con vistas, likes y comentarios.

Este repositorio evoluciona a lo largo de toda la especialización. **Estado
actual: Etapa 4 — Sistema RAG** (asistente conversacional + búsqueda semántica)
sobre el MVP de la Etapa 3 y la infraestructura de la Etapa 2.

## Stack de IA (Etapa 4)

pgvector (Supabase) para la base vectorial · **Voyage AI** (`voyage-3.5`, 1024
dim) para embeddings · **Claude** (`claude-opus-4-8`) para la generación. Flujo
RAG: indexación automática al publicar → búsqueda semántica → construcción de
contexto → respuesta fundamentada con citación de fuentes.

## Flujo del MVP

Registro → inicio de sesión → home con listado de artículos → publicar un
artículo (documento + portada a Supabase Storage) → abrir el artículo (registra
una visualización) → dar "Me gusta" → comentar → cerrar sesión. Todas las
rutas privadas están protegidas por middleware y todos los datos provienen de
Supabase (RLS activa).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS v4 · Shadcn/UI ·
Supabase (PostgreSQL · Auth · Storage · RLS).

## Requisitos

- Node.js 18.18+ (probado con Node 24)
- Una cuenta y un proyecto en [Supabase](https://supabase.com)

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
#   → completa NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#     SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL y SUPABASE_PROJECT_REF

# 3. Crear la base de datos en Supabase (migraciones + seed + validación RLS)
npm run db:setup

# 4. Arrancar en desarrollo
npm run dev            # http://localhost:3000
```

## Scripts

| Script               | Descripción                                              |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo                                   |
| `npm run build`      | Build de producción                                      |
| `npm run start`      | Servir el build                                          |
| `npm run lint`       | ESLint                                                   |
| `npm run db:migrate` | Aplica las migraciones SQL a la BD (`SUPABASE_DB_URL`)   |
| `npm run db:seed`    | Carga los datos de prueba (`seed.sql`)                   |
| `npm run db:test`    | Ejecuta la validación de políticas RLS (PASS/FAIL)       |
| `npm run db:setup`   | `db:migrate` + `db:seed` + `db:test`                     |
| `npm run db:push`    | Aplica migraciones vía CLI de Supabase (proyecto enlazado)|
| `npm run gen:types`  | Regenera `types/database.ts` desde el esquema real       |

## Usuarios de prueba (seed)

Contraseña para todos: `Password123!`

| Email               | Rol    |
| ------------------- | ------ |
| `alice@readhub.dev` | writer |
| `bob@readhub.dev`   | writer |
| `admin@readhub.dev` | admin  |

## Estructura y documentación

La arquitectura, el modelo de datos, la integración con Supabase y las políticas
RLS están documentadas en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Los archivos SQL viven en `supabase/`:

- `migrations/` — fuente canónica (esquema, RLS, storage)
- `schema.sql` / `policies.sql` — copias consolidadas de referencia
- `seed.sql` — datos de prueba
- `tests/rls_validation.sql` — validación de RLS

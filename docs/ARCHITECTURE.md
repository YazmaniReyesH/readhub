# ReadHub — Documentación técnica (Etapa 2: Infraestructura base)

Este documento describe la arquitectura, el modelo de datos, la integración con
Supabase y la estrategia de seguridad del proyecto **ReadHub** tras la sesión de
infraestructura. En esta etapa **no se implementan funcionalidades de negocio ni
interfaces de usuario**: el objetivo es dejar una base escalable lista para las
siguientes sesiones.

---

## 1. Arquitectura general

ReadHub es una plataforma SaaS de lectura y escritura (estilo Medium/Dev.to)
construida sobre **Next.js 15 (App Router)** en el frontend/backend y **Supabase**
(PostgreSQL + Auth + Storage) como plataforma de datos.

### Stack

| Capa            | Tecnología                                  |
| --------------- | ------------------------------------------- |
| Framework       | Next.js 15 (App Router) + React 19          |
| Lenguaje        | TypeScript                                  |
| Estilos         | TailwindCSS v4                              |
| Componentes UI  | Shadcn/UI (Radix)                          |
| Base de datos   | PostgreSQL (gestionado por Supabase)        |
| Autenticación   | Supabase Auth                               |
| Almacenamiento  | Supabase Storage                            |
| Seguridad datos | Row Level Security (RLS)                     |

> **Nota sobre el stack.** El PRD original incluía, en su sección de "prompts de
> implementación", una alternativa con Node/Express + `express-session` + `bcrypt`
> + `Multer`. Se descartó por ser incompatible con el resto del PRD (arquitectura
> de carpetas, "Tecnologías Base") y con los requisitos de la entrega final
> (RAG, MCP). ReadHub usa **Supabase Auth** (en lugar de express-session/bcrypt)
> y **Supabase Storage** (en lugar de Multer con archivos en disco).

---

## 2. Organización de carpetas

```
readhub/
├── app/                    # Rutas (App Router). Aún sin páginas de dominio.
├── components/
│   └── ui/                 # Componentes Shadcn/UI (button, ...)
│   └── (layout, forms, cards, navigation, dialogs, comments, articles)/  # reservadas
├── hooks/                  # Custom hooks (reservada para sesiones futuras)
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Cliente para el navegador (createBrowserClient)
│   │   ├── server.ts       # Cliente para el servidor (createServerClient)
│   │   └── middleware.ts   # updateSession() — refresco de sesión
│   ├── validators/         # (reservada)
│   ├── utils/              # cn() y utilidades
│   └── constants/          # Constantes globales + lectura de env vars
├── services/               # Acceso a datos (reservada para sesiones futuras)
├── types/
│   ├── database.ts         # Tipos del esquema public (tipa los clientes)
│   ├── user.ts
│   ├── article.ts
│   └── comment.ts
├── supabase/
│   ├── migrations/         # Fuente canónica del esquema y las políticas
│   │   ├── 20260715120000_initial_schema.sql
│   │   ├── 20260715120100_rls_policies.sql
│   │   └── 20260715120200_storage.sql
│   ├── schema.sql          # Copia consolidada del esquema (referencia)
│   ├── policies.sql        # Copia consolidada de RLS + Storage (referencia)
│   ├── seed.sql            # Datos de prueba
│   ├── tests/
│   │   └── rls_validation.sql
│   └── config.toml         # Config de la CLI de Supabase
├── scripts/
│   └── run-sql.mjs         # Runner de SQL (aplica migraciones/seed/tests al cloud)
├── middleware.ts           # Middleware global de Next.js
├── .env.example            # Plantilla de variables de entorno
└── docs/ARCHITECTURE.md    # Este documento
```

**Principio:** cada responsabilidad vive en su módulo. Las carpetas de dominio
(`components/*`, `hooks/`, `services/`) se crean vacías (con `.gitkeep`) para
conservar la arquitectura oficial del PRD y poblarlas en sesiones posteriores
**sin reestructurar** el proyecto.

---

## 3. Modelo relacional

Relación 1:1 entre `auth.users` (gestionada por Supabase Auth) y `public.profiles`.
A partir del perfil cuelga todo el contenido.

```
auth.users 1───1 profiles 1───N articles 1───N views
                                   │
                                   ├───N likes
                                   ├───N comments
                                   └───N favorites
```

### Tablas (esquema `public`)

| Tabla       | Descripción                                             | Claves / Restricciones destacadas                          |
| ----------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| `profiles`  | Datos de perfil (1:1 con `auth.users`)                  | PK = FK `id → auth.users(id)`; `role ∈ {reader,writer,admin}` |
| `articles`  | Artículos publicados                                    | FK `author_id → profiles(id)`; `title` no vacío; `is_public` |
| `views`     | Un registro por apertura (BR-011)                        | FK `article_id`; `user_id` opcional (`on delete set null`)  |
| `likes`     | Me gusta                                                 | `UNIQUE(article_id, user_id)` (BR-013)                     |
| `comments`  | Comentarios                                             | `comment` no vacío (BR-017)                                |
| `favorites` | Artículos guardados                                     | `UNIQUE(article_id, user_id)`                              |

**Decisiones de diseño**

- **UUID en todas las PK** (`gen_random_uuid()`), alineado con `auth.users`.
- **`profiles` sin email ni password**: los gestiona `auth.users`. La unicidad
  del correo (BR-001) la garantiza Supabase Auth.
- **`views` no es un contador**: cada apertura es una fila, para poder calcular
  estadísticas por SQL (BR-011).
- **Integridad referencial** con `ON DELETE CASCADE` (al borrar un artículo se
  eliminan sus vistas/likes/comentarios/favoritos → BR-019, BR-020).
- **Índices** sobre todas las FK más consultadas (`author_id`, `article_id`,
  `user_id`) y sobre `articles.created_at` para el listado ordenado.

### Triggers y funciones

- `handle_new_user()` + trigger `on_auth_user_created`: al registrarse un usuario
  en `auth.users`, crea automáticamente su fila en `profiles` leyendo
  `birth_date`, `phone` y `role` desde `raw_user_meta_data`.
- `is_admin()`: helper `SECURITY DEFINER` usado por las políticas RLS para
  resolver el caso administrador sin recursión.

---

## 4. Integración Next.js ↔ Supabase

Se usa `@supabase/ssr` con tres clientes según el contexto de ejecución:

- **`lib/supabase/client.ts`** — `createBrowserClient` para Client Components.
- **`lib/supabase/server.ts`** — `createServerClient` para Server Components,
  Route Handlers y Server Actions; lee/escribe la sesión desde cookies
  (`cookies()` es asíncrono en Next.js 15).
- **`lib/supabase/middleware.ts`** — `updateSession()` refresca el token en cada
  petición y sincroniza cookies. Se invoca desde `middleware.ts`.

Todos los clientes están tipados con `Database` (`types/database.ts`), por lo que
las consultas son type-safe.

### Variables de entorno

| Variable                         | Uso                                            | Expuesta al navegador |
| -------------------------------- | ---------------------------------------------- | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | URL del proyecto                               | Sí                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Clave pública (respeta RLS)                     | Sí                    |
| `SUPABASE_SERVICE_ROLE_KEY`      | Clave admin (scripts, bypass RLS)              | **No**                |
| `SUPABASE_DB_URL`                | Conexión directa a Postgres (migraciones/tests)| **No**                |
| `SUPABASE_PROJECT_REF`           | Referencia para `supabase link`                | **No**                |

---

## 5. Flujo de autenticación (previsto)

1. **Registro:** `supabase.auth.signUp({ email, password, options: { data: { birth_date, phone, role } } })`.
   El trigger crea el `profile` automáticamente.
2. **Inicio de sesión:** `supabase.auth.signInWithPassword(...)`; la sesión se
   guarda en cookies y el middleware la mantiene viva.
3. **Sesión:** los Server Components leen el usuario con el cliente de servidor;
   el middleware refresca el token en cada request.
4. **Cierre de sesión:** `supabase.auth.signOut()` invalida la sesión.

> La implementación de pantallas y protección de rutas corresponde a sesiones
> posteriores; aquí solo queda la infraestructura (clientes + middleware).

---

## 6. Seguridad — Políticas RLS

RLS está **activado en todas las tablas**. Resumen de políticas:

| Tabla       | SELECT                              | INSERT                | UPDATE           | DELETE                  |
| ----------- | ----------------------------------- | --------------------- | ---------------- | ----------------------- |
| `profiles`  | propio o admin                      | propio                | propio           | — (cascade auth.users)  |
| `articles`  | públicos, o autor, o admin          | autenticado (autor=uid)| autor o admin    | autor o admin           |
| `comments`  | todos                               | autenticado (propio)  | autor            | autor o admin           |
| `likes`     | todos                               | autenticado (propio)  | —                | propietario             |
| `views`     | admin o autor del artículo          | autenticado (propio)  | —                | —                       |
| `favorites` | propietario                         | propietario           | —                | propietario             |

**Storage** (buckets):

- `article-covers` — **público** en lectura; escritura solo del propietario
  (carpeta `<user_id>/...`).
- `article-documents` — **privado**; lectura para usuarios autenticados (BR-012),
  escritura solo del propietario.

**Nota de diseño pendiente para sesiones futuras:** la tarjeta de artículo debe
mostrar el número de visualizaciones a cualquier lector, pero la política de
`views` restringe el `SELECT` al autor/admin. Se resolverá exponiendo únicamente
el **conteo agregado** mediante una función `SECURITY DEFINER` / RPC, sin abrir
el detalle de la tabla. Lo mismo aplica si se decide mostrar el nombre del autor:
`profiles` es privado, por lo que se añadirá una vista/columna pública controlada.

---

## 7. Cómo aplicar la base de datos

Con las credenciales en `.env.local` (ver `.env.example`).

> **Conexión IPv4:** la conexión directa (`db.<ref>.supabase.co`) suele ser solo
> IPv6. En redes IPv4 usa el **Session pooler**
> (`aws-<n>-<region>.pooler.supabase.com:5432`, usuario `postgres.<ref>`), que es
> lo que emplean los scripts `db:*`.

```bash
# Opción A — runner de Node (solo necesita SUPABASE_DB_URL, multiplataforma)
npm run db:migrate     # aplica las migraciones en orden
npm run db:seed        # carga los datos de prueba
npm run db:test        # ejecuta la validación de RLS (imprime PASS/FAIL)
npm run db:setup       # las tres anteriores en secuencia

# Opción B — CLI de Supabase (requiere `supabase link --project-ref <ref>`)
npm run db:push        # aplica migraciones al proyecto enlazado
npm run gen:types      # regenera types/database.ts desde el esquema real
```

---

## 8. Capa de presentación (Etapa 3 — MVP)

El frontend respeta una separación estricta en tres capas:

```
Componentes (UI)  →  Custom Hooks (lógica)  →  Services (acceso a Supabase)
```

- **Services** (`services/`): único punto que habla con Supabase.
  `auth.service`, `article.service`, `comment.service`, `storage.service`.
- **Hooks** (`hooks/`): lógica de negocio y estado de React. `useAuth`
  (contexto de sesión), `useArticles` (feed/detalle/creación/documento),
  `useComments`, `useLikes`, `useUpload`. Consumen solo Services.
- **Componentes** (`components/`): presentación. No llaman a Supabase
  directamente; usan Hooks.

**Rutas** (App Router con Route Groups):

| Ruta            | Grupo         | Descripción                                  |
| --------------- | ------------- | -------------------------------------------- |
| `/login`        | `(auth)`      | Inicio de sesión (toggle a registro)         |
| `/register`     | `(auth)`      | Registro                                     |
| `/`             | `(dashboard)` | Home: listado de artículos                   |
| `/upload`       | `(dashboard)` | Publicación de artículos                     |
| `/article/[id]` | `(dashboard)` | Detalle: documento, likes y comentarios      |

**Protección de rutas:** `middleware.ts` refresca la sesión y redirige a
`/login` las rutas privadas sin sesión, y a `/` las de auth con sesión.

**Migraciones añadidas en esta etapa** (no alteran las de la Etapa 2):

- `0004_full_name_and_stats`: columna `profiles.full_name` + funciones
  `SECURITY DEFINER` `get_articles_feed()` y `get_article_detail(uuid)` que
  exponen autor y conteos (views/likes/comments) respetando la RLS.
- `0005_comments_with_author`: `get_article_comments(uuid)` con el nombre del
  autor de cada comentario.

Estas funciones resuelven la necesidad de mostrar el nº de visualizaciones y el
autor sin abrir las tablas `views` ni `profiles` (que siguen protegidas).

## 9. Estrategia de escalabilidad

- **Arquitectura modular** por responsabilidad (UI / hooks / services / lib /
  types) que no se reestructura entre sesiones, solo se amplía.
- **Modelo de datos preparado** para categorías, etiquetas, favoritos, panel
  admin, embeddings y RAG **sin alterar** las tablas principales (se añaden
  nuevas tablas/relaciones).
- **API versionable** y servicios centralizados en `services/` (sesiones futuras).
- **Tipado fuerte** de extremo a extremo mediante `types/database.ts`.
- **Seguridad desde el día 1** con RLS en todas las tablas y buckets.

# Despliegue de ReadHub en Vercel

El pipeline (`.github/workflows/ci.yml`) despliega **automáticamente** a Vercel,
pero **solo si** pasan todas las validaciones: type-check, lint, Vitest,
Playwright (E2E), presupuesto de bundle y auditoría Lighthouse. En `push` a `main`
despliega a **producción**; en Pull Requests crea un **preview**.

El despliegue lo ejecuta **GitHub Actions con la CLI de Vercel** (no la
integración Git de Vercel), para garantizar que nada se publique sin pasar el
gate de rendimiento. Por eso hay que **desconectar la auto-deploy de Vercel** y
darle a GitHub 3 secretos.

---

## Paso 0 — Requisitos

- Cuenta en <https://vercel.com> (el plan gratuito "Hobby" sirve).
- El repositorio ya en GitHub: `YazmaniReyesH/readhub`.
- Tener a mano las claves de producción de la app (las de Supabase Cloud, Voyage
  y Anthropic).

---

## Paso 1 — Crear el proyecto en Vercel (monorepo)

1. Entra a <https://vercel.com/new>.
2. **Import Git Repository** → elige `readhub`.
3. **⚠️ CLAVE (monorepo):** en **Root Directory** pulsa *Edit* y selecciona
   **`apps/web`**. (Si no lo haces, Vercel intentará construir la raíz del
   monorepo y fallará.) Asegúrate de que quede activado **"Include source files
   outside of the Root Directory in the Build Step"** (Vercel lo enciende solo al
   detectar el monorepo) para que resuelva los paquetes `@readhub/*` (npm
   workspaces). El pipeline usa **build remoto** en Vercel, que respeta estos
   ajustes.
4. **Framework Preset:** debe autodetectar **Next.js**. Déjalo así.
5. **NO** pulses *Deploy* todavía: primero añade las variables de entorno
   (Paso 2). Si ya desplegó, no pasa nada; lo corregimos igual.

---

## Paso 2 — Variables de entorno del proyecto (en Vercel)

En **Project → Settings → Environment Variables**, agrega estas (marca los 3
entornos: *Production*, *Preview* y *Development*, salvo donde se indique):

| Variable | Valor | Notas |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase **Cloud** | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key de Supabase Cloud | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key de Supabase Cloud | **secreta** (solo servidor) |
| `VOYAGE_API_KEY` | tu clave de Voyage AI | **secreta** |
| `ANTHROPIC_API_KEY` | tu clave de Anthropic | **secreta** |
| `NEXT_PUBLIC_SITE_URL` | la URL de producción de Vercel (p. ej. `https://readhub.vercel.app`) | pública; actualízala cuando conozcas la URL final |

> Son las mismas variables que usas en `apps/web/.env.local`, apuntando a tu
> Supabase **Cloud** (no al local). Las variables `SUPABASE_DB_*` **no** hacen
> falta en Vercel (solo las usan los scripts `db:*` locales).

---

## Paso 3 — Desactivar la auto-deploy de Git de Vercel

Para que **solo** despliegue el pipeline (tras pasar el gate) y no Vercel por su
cuenta en cada push:

- **Opción recomendada (simple):** *Project → Settings → Git →* **Disconnect**
  el repositorio. La CLI seguirá desplegando desde GitHub Actions sin problema.
- **Alternativa (mantener Git conectado):** *Settings → Git → Ignored Build Step*
  y pon el comando `exit 0` para que Vercel ignore sus propios builds por Git.

---

## Paso 4 — Obtener los 3 secretos para GitHub

Necesitas `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.

### 4.1 `VERCEL_TOKEN`
1. <https://vercel.com/account/tokens> → **Create Token**.
2. Nombre: `readhub-ci`; Scope: tu cuenta/equipo; Expiración: la que prefieras.
3. **Copia el token ahora** (no se vuelve a mostrar).

### 4.2 `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` (método fiable con CLI)
En tu máquina, desde la carpeta `readhub/`:

```bash
npm i -g vercel
vercel login
vercel link      # elige tu cuenta/equipo y el proyecto "readhub" ya creado
```

Esto crea `readhub/.vercel/project.json` con:

```json
{ "orgId": "team_XXXX o tu userId", "projectId": "prj_XXXX" }
```

- `VERCEL_ORG_ID` = el valor de `orgId`.
- `VERCEL_PROJECT_ID` = el valor de `projectId`.

> `.vercel/` ya está en `.gitignore` (no se sube). Si prefieres el dashboard:
> *Project → Settings → General →* **Project ID**; y el **Team ID** (org id) está
> en *Team/Account → Settings → General*.

---

## Paso 5 — Cargar los secretos en GitHub

En GitHub: **repo → Settings → Secrets and variables → Actions → New repository
secret**. Crea exactamente estos tres (los nombres deben coincidir):

| Secret | Valor |
|--------|-------|
| `VERCEL_TOKEN` | el token del Paso 4.1 |
| `VERCEL_ORG_ID` | el `orgId` del Paso 4.2 |
| `VERCEL_PROJECT_ID` | el `projectId` del Paso 4.2 |

> No pongas aquí las claves de Supabase/Voyage/Anthropic: esas van en **Vercel**
> (Paso 2), no en GitHub.

---

## Paso 6 — Probar

1. Haz merge del PR de la Etapa 7 a `main` (o un push a `main`).
2. En **Actions**, la corrida ejecuta: checks → e2e → **Rendimiento** → **Deploy**.
3. Si todo pasa, el job **Despliegue a Vercel** publica a producción y deja la
   URL en el *Summary* de la corrida.
4. Actualiza `NEXT_PUBLIC_SITE_URL` en Vercel con la URL final si cambió y vuelve
   a desplegar.

### Comportamiento del job de deploy

- **Sin secretos configurados:** el job **no falla**; detecta que faltan y omite
  el despliegue con un aviso (así el PR no se pone en rojo antes de configurar).
- **En Pull Request:** despliega un **preview**.
- **En push a `main`:** despliega a **producción** (`--prod`).

---

## Solución de problemas

- **"Project not found" / builds vacíos:** revisa que `VERCEL_PROJECT_ID` y
  `VERCEL_ORG_ID` correspondan al proyecto correcto y que el **Root Directory**
  sea `apps/web`.
- **Errores de variables en runtime:** falta alguna env var del Paso 2 en el
  entorno correspondiente (Production/Preview).
- **Se despliega sin pasar el gate:** no desactivaste la auto-deploy de Git
  (Paso 3).
- **`Cannot find module '@readhub/...'` en el build de Vercel:** falta activar
  **"Include source files outside of the Root Directory in the Build Step"** en
  *Settings → General* (necesario para resolver los workspaces del monorepo).

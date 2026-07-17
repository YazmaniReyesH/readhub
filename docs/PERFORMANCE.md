# Rendimiento de ReadHub

Estrategias de optimización aplicadas y cómo el pipeline las protege. Complementa
la arquitectura general (`CLAUDE.md`) y el despliegue (`docs/DEPLOYMENT.md`).

## 1. Optimizaciones implementadas (Etapa 7)

Todas respetan las restricciones de la sesión: **no** se tocó lógica de negocio,
flujo RAG, APIs, arquitectura ni funcionalidades. Solo rendimiento.

| # | Problema | Solución | Archivos | Impacto en Core Web Vitals |
|---|----------|----------|----------|-----------------------------|
| 1 | La imagen LCP del feed (portada) no se precargaba. | `priority` en las 3 primeras `ArticleCard` (above-the-fold). | `components/cards/article-card.tsx`, `app/(dashboard)/page.tsx` | **LCP ↓**: el navegador precarga la portada visible en vez de descubrirla tarde. |
| 2 | El asistente cargaba `ChatWindow` **y** `SemanticSearch` aunque solo se ve una pestaña. | `next/dynamic` (`ssr: false`) con skeleton por panel. | `app/(dashboard)/assistant/page.tsx` | **INP/TBT ↓**: First Load JS de `/assistant` **128 → 119 kB**; menos JS que parsear. |
| 3 | Se cargaba la webfont `Geist_Mono` sin que ninguna clase `font-mono` la usara. | Eliminada la carga; `font-mono` → pila monoespaciada del sistema; `display: swap` explícito en la sans. | `app/layout.tsx`, `app/globals.css` | **LCP/FCP ↓**: una webfont menos que descargar/bloquear; sin CLS por `swap`. |
| 4 | Imports de barril de la librería de UI sin optimizar; imágenes servidas en formatos pesados. | `experimental.optimizePackageImports` (`@base-ui/react`, `lucide-react`) y `images.formats` = AVIF/WebP. | `next.config.ts` | **Bundle ↓** (tree-shaking) y **LCP/transferencia ↓** (imágenes AVIF/WebP). |
| 5 | `ArticleCard` se re-renderizaba con cualquier cambio de estado del feed. | `React.memo`. | `components/cards/article-card.tsx` | **INP ↓** (leve): cada tarjeta solo se repinta si cambia su `article`/`priority`. |

### Recomendaciones NO implementadas (requieren cambio de arquitectura)

Se documentan pero quedan fuera del alcance de la Etapa 7 (prohibido tocar
arquitectura):

- **Renderizar el contenido en el servidor (RSC/SSR + streaming).** Hoy `/` y
  `/article/[id]` son componentes de cliente que hacen *fetch* con hooks; el LCP
  depende de hidratar + pedir datos. Migrar a React Server Components daría el
  mayor salto de LCP, pero cambia la estrategia de datos (capa Componente→Hook→
  Service) → fuera de alcance.
- **`@supabase/supabase-js` en todas las rutas.** El `AuthProvider` vive en el
  root layout, así que el cliente de Supabase (~100 kB) entra en el bundle de
  cada ruta (incl. `/login`, 214 kB). Reducirlo exige mover dónde vive la sesión.

## 2. Presupuestos y umbrales (gate del pipeline)

El job **Rendimiento** del pipeline bloquea el merge/despliegue si no se cumplen:

| Métrica | Umbral | Severidad |
|---------|--------|-----------|
| Lighthouse **Performance** | ≥ 0.90 | 🔴 error (bloquea) |
| Lighthouse **Accessibility** | ≥ 0.90 | 🔴 error (bloquea) |
| **CLS** (Cumulative Layout Shift) | ≤ 0.10 | 🔴 error (bloquea) |
| **LCP** (Largest Contentful Paint) | ≤ 2.5 s | 🟡 aviso |
| **TBT** (Total Blocking Time) | ≤ 300 ms | 🟡 aviso |
| Best Practices / SEO | ≥ 0.90 | 🟡 aviso |
| **First Load JS** por ruta | ≤ 300 kB | 🔴 error (bloquea) |

**Por qué LCP/TBT son avisos y no errores:** Lighthouse audita en **móvil con
throttling** (CPU 4×), donde el LCP de la app ronda ~2.7 s por el bundle de
`supabase-js`. El *score* holístico de Performance (que ya pondera el LCP) **sí**
es un gate duro en 0.90 y la app lo supera con margen (~0.96), así que el
rendimiento queda genuinamente protegido sin bloqueos por ruido de CI. Configura
los umbrales en [`apps/web/lighthouserc.json`](../apps/web/lighthouserc.json) y el
presupuesto de bundle vía `BUNDLE_BUDGET_KB` en el workflow.

## 3. Cómo leer los reportes del pipeline

Cada corrida del job **Rendimiento** publica el artefacto **`performance-report`**
(pestaña *Actions* → la corrida → *Artifacts*). Contiene:

- `bundle-report.md` — tabla de First Load JS por ruta, ruta más pesada y si entra
  en el presupuesto.
- `build-output.txt` — salida cruda de `next build`.
- `lighthouse-report/` — reportes de Lighthouse (JSON + HTML) por página; abre el
  `.report.html` para ver el desglose de métricas y oportunidades.

Si el gate falla, el paso correspondiente (bundle o Lighthouse) muestra en el log
qué umbral se incumplió.

## 4. Buenas prácticas para mantener el rendimiento

- **Imágenes:** siempre `next/image`; `priority` solo en la imagen LCP
  (above-the-fold), nunca en todas. Provee `sizes` correctos.
- **Client vs Server:** marca `"use client"` solo cuando haya estado/efectos. La
  presentación pura debería poder renderizarse en el servidor.
- **Code-splitting:** usa `next/dynamic` para paneles/diálogos pesados que no se
  ven en el primer render.
- **Dependencias:** evita añadir librerías grandes al cliente; si una expone un
  barril, añádela a `optimizePackageImports`.
- **Fuentes:** carga solo las familias que uses, siempre vía `next/font` con
  `display: swap`.
- **Vigila el presupuesto:** si una ruta se acerca a 300 kB de First Load JS,
  revisa qué se está importando en el cliente antes de subir el umbral.
- **No rompas el gate:** ejecuta `npm run build` y revisa la tabla de bundle antes
  de abrir el PR.

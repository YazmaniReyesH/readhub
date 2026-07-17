// =============================================================================
// bundle-report.mjs — Reporte y gate del tamaño del bundle
// =============================================================================
// Analiza la salida de `next build` (tabla "First Load JS" por ruta), genera un
// reporte Markdown y falla (exit 1) si la ruta más pesada supera el presupuesto.
//
// Uso:  node scripts/bundle-report.mjs <build-output.txt> <report.md>
// Env:  BUNDLE_BUDGET_KB (por defecto 300) — presupuesto de First Load JS por ruta.
//
// No depende de librerías externas: parsea el texto que ya imprime Next, que es
// exactamente lo que ve el desarrollador en local.
// =============================================================================

import { readFileSync, writeFileSync } from "node:fs";

const [inputPath, reportPath] = process.argv.slice(2);
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? "300");

if (!inputPath || !reportPath) {
  console.error("Uso: node scripts/bundle-report.mjs <build-output.txt> <report.md>");
  process.exit(2);
}

// Quita códigos de color ANSI (por si Next los emitiera).
const stripAnsi = (s) => s.replace(/\[[0-9;]*m/g, "");
const raw = stripAnsi(readFileSync(inputPath, "utf8"));

// Convierte "214 kB" / "1.2 MB" / "137 B" a KB numéricos.
function toKB(value, unit) {
  const n = Number(value);
  if (unit === "MB") return n * 1024;
  if (unit === "B") return n / 1024;
  return n; // kB
}

// Una fila de ruta contiene un path que empieza por "/" y al menos un tamaño.
// El ÚLTIMO tamaño de la fila es el "First Load JS".
const sizeToken = /(\d+(?:\.\d+)?)\s*(B|kB|MB)/g;
const routes = [];
let sharedKB = null;

for (const line of raw.split(/\r?\n/)) {
  const sizes = [...line.matchAll(sizeToken)];
  if (sizes.length === 0) continue;

  const sharedMatch = /First Load JS shared by all/i.test(line);
  if (sharedMatch) {
    const [, v, u] = sizes[sizes.length - 1];
    sharedKB = toKB(v, u);
    continue;
  }

  // Extrae el path de la ruta (tras marcadores de árbol/tipo: ┌ ├ └ │ ○ ƒ ● ◐ -).
  const pathMatch = line.match(/([/][\w[\]().:-]*)/);
  if (!pathMatch) continue;
  // Ignora las líneas de chunks compartidos (nombres de archivo .js), que no
  // son rutas de la app.
  if (pathMatch[1].endsWith(".js")) continue;

  const [, v, u] = sizes[sizes.length - 1];
  routes.push({ route: pathMatch[1], firstLoadKB: toKB(v, u) });
}

if (routes.length === 0) {
  console.error("No se pudieron detectar rutas en la salida de next build.");
  process.exit(2);
}

routes.sort((a, b) => b.firstLoadKB - a.firstLoadKB);
const heaviest = routes[0];
const pass = heaviest.firstLoadKB <= BUDGET_KB;

const fmt = (kb) => (kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} kB`);

const lines = [
  "# 📦 Reporte de tamaño de bundle",
  "",
  `**Presupuesto (First Load JS por ruta):** ${BUDGET_KB} kB`,
  `**Ruta más pesada:** \`${heaviest.route}\` → ${fmt(heaviest.firstLoadKB)}`,
  sharedKB != null ? `**Shared por todas las rutas:** ${fmt(sharedKB)}` : "",
  `**Resultado:** ${pass ? "✅ DENTRO del presupuesto" : "❌ EXCEDE el presupuesto"}`,
  "",
  "| Ruta | First Load JS |",
  "|------|---------------|",
  ...routes.map(
    (r) =>
      `| \`${r.route}\` | ${fmt(r.firstLoadKB)}${r.firstLoadKB > BUDGET_KB ? " ⚠️" : ""} |`,
  ),
  "",
].filter((l) => l !== "");

writeFileSync(reportPath, lines.join("\n"), "utf8");

console.log(lines.join("\n"));
if (!pass) {
  console.error(
    `\n❌ Gate de bundle FALLIDO: \`${heaviest.route}\` (${fmt(heaviest.firstLoadKB)}) supera el presupuesto de ${BUDGET_KB} kB.`,
  );
  process.exit(1);
}
console.log(`\n✅ Gate de bundle OK (máximo ${fmt(heaviest.firstLoadKB)} ≤ ${BUDGET_KB} kB).`);

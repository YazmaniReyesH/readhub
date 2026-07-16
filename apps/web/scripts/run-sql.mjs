/**
 * Ejecuta uno o varios archivos .sql contra la base de datos indicada en
 * SUPABASE_DB_URL (.env.local). Multiplataforma: no requiere psql.
 *
 * Uso:
 *   node scripts/run-sql.mjs <archivo.sql> [<archivo2.sql> ...]
 *
 * Cada archivo se envía como un único lote (permite BEGIN/ROLLBACK y bloques
 * DO $$ ... $$). Los mensajes RAISE NOTICE se imprimen en consola, por lo que
 * también sirve para el script de validación de RLS.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: node scripts/run-sql.mjs <archivo.sql | carpeta> [...]");
  process.exit(1);
}

// Expande carpetas a sus archivos .sql ordenados alfabéticamente (por timestamp).
const files = args.flatMap((arg) => {
  const abs = resolve(process.cwd(), arg);
  if (statSync(abs).isDirectory()) {
    return readdirSync(abs)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => join(arg, f));
  }
  return [arg];
});

// Configuración de conexión.
// Se prefieren los parámetros discretos (SUPABASE_DB_*) porque evitan cualquier
// problema de codificación cuando el password contiene caracteres especiales
// como `$`, `@` o `:`. Si no están, se usa SUPABASE_DB_URL.
function buildClientConfig() {
  const {
    SUPABASE_DB_HOST,
    SUPABASE_DB_PORT,
    SUPABASE_DB_USER,
    SUPABASE_DB_PASSWORD,
    SUPABASE_DB_NAME,
    SUPABASE_DB_URL,
  } = process.env;

  // Supabase exige TLS; el certificado es válido pero evitamos fricción local.
  const ssl = { rejectUnauthorized: false };

  if (SUPABASE_DB_HOST && SUPABASE_DB_PASSWORD) {
    return {
      host: SUPABASE_DB_HOST,
      port: Number(SUPABASE_DB_PORT) || 5432,
      user: SUPABASE_DB_USER || "postgres",
      password: SUPABASE_DB_PASSWORD,
      database: SUPABASE_DB_NAME || "postgres",
      ssl,
    };
  }

  if (SUPABASE_DB_URL) {
    return { connectionString: SUPABASE_DB_URL, ssl };
  }

  console.error(
    "Falta la configuración de la BD en .env.local: define SUPABASE_DB_HOST + " +
      "SUPABASE_DB_PASSWORD (recomendado) o SUPABASE_DB_URL. Ver .env.example.",
  );
  process.exit(1);
}

const client = new pg.Client(buildClientConfig());

client.on("notice", (msg) => {
  if (msg.message) console.log("  " + msg.message);
});

try {
  await client.connect();
  for (const file of files) {
    const path = resolve(process.cwd(), file);
    const sql = readFileSync(path, "utf8");
    console.log(`\n▶ Ejecutando ${file} ...`);
    await client.query(sql);
    console.log(`✔ ${file} ejecutado correctamente.`);
  }
} catch (err) {
  console.error(`\n✖ Error ejecutando SQL: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}

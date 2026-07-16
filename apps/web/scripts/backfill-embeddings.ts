/**
 * Indexa artículos en la base vectorial reutilizando el servicio compartido
 * (@readhub/shared → indexArticle), que ahora extrae texto de TXT y PDF.
 *
 * Uso (desde apps/web):
 *   npm run db:backfill                 → indexa los artículos SIN embedding
 *   npm run db:backfill -- --force      → reindexa TODOS los artículos
 *   npm run db:backfill -- <articleId>  → (re)indexa solo ese artículo
 *
 * Respeta el límite del plan gratuito de Voyage (3 req/min) con un throttle.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createAdminClient } from "@readhub/database";
import { indexArticle } from "@readhub/shared";

const THROTTLE_MS = 21_000; // ~3 req/min

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const idArg = args.find((a) => !a.startsWith("--"));

  const admin = createAdminClient();
  const { data: articles, error } = await admin
    .from("articles")
    .select("id, title")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  let targets: { id: string; title: string }[];
  if (idArg) {
    targets = (articles ?? []).filter((a) => a.id === idArg);
    if (targets.length === 0) throw new Error(`No existe el artículo ${idArg}.`);
  } else if (force) {
    targets = articles ?? [];
  } else {
    const { data: embs } = await admin
      .from("article_embeddings")
      .select("article_id");
    const indexed = new Set((embs ?? []).map((e) => e.article_id));
    targets = (articles ?? []).filter((a) => !indexed.has(a.id));
  }

  if (targets.length === 0) {
    console.log("No hay artículos por indexar.");
    return;
  }

  console.log(`Indexando ${targets.length} artículo(s)…`);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    try {
      const res = await indexArticle(t.id);
      console.log(`  ✔ "${t.title}" (${res.dimensions} dim)`);
    } catch (e) {
      console.error(`  ✖ "${t.title}": ${(e as Error).message}`);
    }
    if (i < targets.length - 1) await sleep(THROTTLE_MS);
  }
  console.log("Hecho.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

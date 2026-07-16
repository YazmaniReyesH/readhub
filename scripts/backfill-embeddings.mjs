/**
 * Backfill de embeddings: indexa en la base vectorial todos los artículos que
 * aún no tienen embedding (p. ej. los del seed, creados antes del RAG).
 * A partir de aquí, los artículos nuevos se indexan automáticamente al publicar.
 *
 * Uso:  node scripts/backfill-embeddings.mjs
 * Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * OPENAI_API_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_KEY = process.env.VOYAGE_API_KEY;
const EMBEDDING_MODEL = process.env.VOYAGE_EMBEDDING_MODEL || "voyage-3.5";
const DOCS_BUCKET = "article-documents";

if (!URL || !SERVICE || !VOYAGE_KEY) {
  console.error(
    "Faltan variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY.",
  );
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

async function embed(text) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOYAGE_KEY}`,
    },
    body: JSON.stringify({
      input: [text.replace(/\s+/g, " ").trim().slice(0, 8000)],
      model: EMBEDDING_MODEL,
      input_type: "document",
    }),
  });
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const json = await res.json();
  return json.data[0].embedding;
}

function normalizeDocPath(path) {
  const prefix = `${DOCS_BUCKET}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

async function buildText(article) {
  const parts = [article.title];
  if (article.summary) parts.push(article.summary);
  const path = article.document_path;
  if (path && normalizeDocPath(path).toLowerCase().endsWith(".txt")) {
    try {
      const { data, error } = await admin.storage
        .from(DOCS_BUCKET)
        .download(normalizeDocPath(path));
      if (!error && data) {
        const text = (await data.text()).trim();
        if (text) parts.push(text.slice(0, 6000));
      }
    } catch {
      /* ignora documentos ilegibles */
    }
  }
  return parts.join("\n\n");
}

const args = process.argv.slice(2);
const force = args.includes("--force");

const { data: articles, error } = await admin
  .from("articles")
  .select("id, title, summary, document_path");
if (error) {
  console.error("Error leyendo artículos:", error.message);
  process.exit(1);
}

let existing = new Set();
if (!force) {
  const { data: emb } = await admin
    .from("article_embeddings")
    .select("article_id");
  existing = new Set((emb ?? []).map((e) => e.article_id));
}

let indexed = 0;
for (const article of articles) {
  if (!force && existing.has(article.id)) {
    console.log(`  skip  "${article.title}" (ya indexado)`);
    continue;
  }
  try {
    const content = await buildText(article);
    const embedding = await embed(content);
    const { error: upErr } = await admin.from("article_embeddings").upsert(
      {
        article_id: article.id,
        embedding: JSON.stringify(embedding),
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "article_id" },
    );
    if (upErr) throw new Error(upErr.message);
    indexed++;
    console.log(`  ✔ indexado "${article.title}" (${embedding.length} dim)`);
  } catch (e) {
    console.error(`  ✖ error en "${article.title}": ${e.message}`);
  }
}

console.log(`\nHecho. ${indexed} artículo(s) indexado(s) de ${articles.length}.`);

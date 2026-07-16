
import { createAdminClient } from "@readhub/database";
import { embedText } from "@readhub/ai";
import { STORAGE_BUCKETS } from "@readhub/config";
import type { IndexResult } from "@readhub/types";

/**
 * Servicio de embeddings (SOLO servidor). Centraliza la generación y
 * persistencia de las representaciones vectoriales de los artículos.
 * Reutilizable por la indexación automática y el backfill.
 */

/** Normaliza una ruta de Storage quitando el prefijo del bucket si lo trae. */
function normalizeDocPath(path: string): string {
  const prefix = `${STORAGE_BUCKETS.documents}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

/**
 * Construye el texto que se vectoriza a partir del artículo.
 * Estrategia: título + resumen + (contenido del documento si es TXT). Se prioriza
 * la información más representativa para maximizar la calidad de la búsqueda
 * semántica. Para PDF/DOCX (sin extracción nativa en esta fase) se usa el resumen.
 */
async function buildArticleText(article: {
  title: string;
  summary: string | null;
  document_path: string | null;
}): Promise<string> {
  const parts: string[] = [article.title];
  if (article.summary) parts.push(article.summary);

  const path = article.document_path;
  if (path && normalizeDocPath(path).toLowerCase().endsWith(".txt")) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.storage
        .from(STORAGE_BUCKETS.documents)
        .download(normalizeDocPath(path));
      if (!error && data) {
        const text = (await data.text()).trim();
        if (text) parts.push(text.slice(0, 6000));
      }
    } catch {
      // Si el documento no se puede leer, se indexa con título + resumen.
    }
  }
  return parts.join("\n\n");
}

/**
 * Genera el embedding de un artículo y lo almacena (upsert) en la base
 * vectorial. Devuelve el resultado o lanza si el artículo no existe.
 */
export async function indexArticle(articleId: string): Promise<IndexResult> {
  const admin = createAdminClient();

  const { data: article, error } = await admin
    .from("articles")
    .select("id, title, summary, document_path")
    .eq("id", articleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!article) throw new Error(`El artículo ${articleId} no existe.`);

  const content = await buildArticleText(article);
  const embedding = await embedText(content);

  const { error: upsertError } = await admin.from("article_embeddings").upsert(
    {
      article_id: article.id,
      embedding: JSON.stringify(embedding),
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "article_id" },
  );
  if (upsertError) throw new Error(upsertError.message);

  return { articleId: article.id, dimensions: embedding.length };
}

/** Elimina el embedding de un artículo (evita vectores huérfanos). */
export async function removeArticleEmbedding(articleId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("article_embeddings")
    .delete()
    .eq("article_id", articleId);
  if (error) throw new Error(error.message);
}

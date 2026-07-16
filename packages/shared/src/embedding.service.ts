
import { createAdminClient } from "@readhub/database";
import { embedText } from "@readhub/ai";
import {
  DOCUMENT_SUMMARY_PLACEHOLDER,
  STORAGE_BUCKETS,
  deriveSummary,
} from "@readhub/config";
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
 * Descarga un documento de Storage y extrae su texto.
 * Soporta TXT y PDF. Para DOCX u otros formatos devuelve cadena vacía (se
 * indexa con título + resumen). Nunca lanza: un fallo no debe romper el indexado.
 */
async function extractDocumentText(path: string): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(STORAGE_BUCKETS.documents)
      .download(path);
    if (error || !data) return "";

    const ext = path.toLowerCase().split(".").pop();
    if (ext === "txt") {
      return (await data.text()).trim();
    }
    if (ext === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const buffer = new Uint8Array(await data.arrayBuffer());
      const pdf = await getDocumentProxy(buffer);
      // Con mergePages: true, `text` es un string único.
      const { text } = await extractText(pdf, { mergePages: true });
      return text.trim();
    }
    return "";
  } catch {
    return "";
  }
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

  // Extrae el texto del documento (TXT/PDF) una sola vez.
  const docText = article.document_path
    ? await extractDocumentText(normalizeDocPath(article.document_path))
    : "";

  // Texto a vectorizar: título + resumen + contenido del documento.
  const content = [article.title, article.summary, docText.slice(0, 6000)]
    .filter(Boolean)
    .join("\n\n");
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

  // Deriva el resumen desde el texto del documento si aún es provisional o vacío.
  if (docText) {
    const needsSummary =
      !article.summary || article.summary === DOCUMENT_SUMMARY_PLACEHOLDER;
    const derived = deriveSummary(docText);
    if (needsSummary && derived) {
      await admin
        .from("articles")
        .update({ summary: derived })
        .eq("id", article.id);
    }
  }

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

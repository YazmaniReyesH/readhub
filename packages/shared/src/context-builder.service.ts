
import { buildRagSystemPrompt } from "@readhub/ai";
import { RAG_MAX_CONTEXT_CHARS, RAG_MAX_DOC_CHARS } from "@readhub/config";
import type { ChatSource } from "@readhub/types";
import type { RetrievedArticle } from "@readhub/types";

/**
 * Servicio constructor de contexto (SOLO servidor). Transforma los documentos
 * recuperados en un prompt de sistema estructurado y en la lista de fuentes.
 * No realiza búsquedas ni llama al LLM.
 *
 * Estrategia:
 *  - Orden por relevancia (los docs ya vienen ordenados por similitud).
 *  - Límite por documento (RAG_MAX_DOC_CHARS) y límite global
 *    (RAG_MAX_CONTEXT_CHARS) para controlar tokens y coste; configurable.
 *  - Cada bloque conserva su origen (título) para poder citar las fuentes.
 */
export interface BuiltContext {
  systemPrompt: string;
  sources: ChatSource[];
  hasContext: boolean;
}

export function buildContext(docs: RetrievedArticle[]): BuiltContext {
  const selected: RetrievedArticle[] = [];
  let total = 0;

  for (const doc of docs) {
    const snippet = doc.content.trim().slice(0, RAG_MAX_DOC_CHARS);
    if (!snippet) continue;
    // Respeta el límite global salvo que aún no haya ningún documento incluido.
    if (total + snippet.length > RAG_MAX_CONTEXT_CHARS && selected.length > 0) {
      break;
    }
    selected.push({ ...doc, content: snippet });
    total += snippet.length;
  }

  const context = selected
    .map(
      (doc, i) =>
        `[Fuente ${i + 1}] Título: "${doc.title}"${
          doc.author_name ? ` — Autor: ${doc.author_name}` : ""
        }\n${doc.content}`,
    )
    .join("\n\n---\n\n");

  const sources: ChatSource[] = selected.map((doc) => ({
    articleId: doc.article_id,
    title: doc.title,
    authorName: doc.author_name,
    similarity: doc.similarity,
  }));

  return {
    systemPrompt: buildRagSystemPrompt(context),
    sources,
    hasContext: selected.length > 0,
  };
}

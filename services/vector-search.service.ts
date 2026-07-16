import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/ai/embeddings";
import { RAG_SIMILARITY_THRESHOLD, RAG_TOP_K } from "@/lib/constants";
import type { RetrievedArticle, SearchOptions } from "@/types/vector-search";

/**
 * Servicio de recuperación semántica (SOLO servidor). Su única responsabilidad
 * es recuperar los artículos más relevantes para una consulta. No construye
 * contexto ni habla con el LLM.
 *
 * Ranking por defecto:
 *  - Top-K = 5: suficiente para dar contexto sin diluir la relevancia.
 *  - Umbral de similitud = 0.2: descarta coincidencias débiles (ruido) sin ser
 *    tan estricto que deje sin resultados consultas válidas.
 */
export async function searchArticles(
  query: string,
  options: SearchOptions = {},
): Promise<RetrievedArticle[]> {
  const topK = options.topK ?? RAG_TOP_K;
  const threshold = options.similarityThreshold ?? RAG_SIMILARITY_THRESHOLD;

  // 1. Generar el embedding de la consulta (reutiliza el servicio de embeddings).
  const queryEmbedding = await embedText(query, "query");

  // 2. Búsqueda por similitud mediante la función SQL (usa el índice HNSW).
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("match_articles", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: topK,
    similarity_threshold: threshold,
  });
  if (error) throw new Error(error.message);

  return (data ?? []) as RetrievedArticle[];
}

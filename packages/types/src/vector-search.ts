/** Artículo recuperado por la búsqueda semántica (fila de `match_articles`). */
export interface RetrievedArticle {
  article_id: string;
  title: string;
  summary: string | null;
  content: string;
  author_name: string | null;
  similarity: number;
}

/** Opciones de recuperación (ranking). */
export interface SearchOptions {
  topK?: number;
  similarityThreshold?: number;
}

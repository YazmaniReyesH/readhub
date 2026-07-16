/** Un embedding es un vector de números en coma flotante. */
export type Embedding = number[];

/** Resultado de indexar un artículo en la base vectorial. */
export interface IndexResult {
  articleId: string;
  dimensions: number;
}

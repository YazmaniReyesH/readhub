export type ChatRole = "user" | "assistant";

/** Fuente citada en una respuesta del asistente. */
export interface ChatSource {
  articleId: string;
  title: string;
  authorName: string | null;
  similarity: number;
}

/** Mensaje del historial de la conversación. */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Fuentes utilizadas (solo en respuestas del asistente). */
  sources?: ChatSource[];
}

/** Turno de la conversación enviado al backend (sin metadatos de UI). */
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

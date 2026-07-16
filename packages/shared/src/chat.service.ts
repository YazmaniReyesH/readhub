import { searchArticles } from "./vector-search.service";
import { buildContext } from "./context-builder.service";
import { NO_CONTEXT_MESSAGE, completeText, streamCompletion } from "@readhub/ai";
import type { ChatSource, ChatTurn } from "@readhub/types";

/**
 * Servicio conversacional. Orquesta el flujo RAG completo y es el único que
 * habla con el LLM (a través de @readhub/ai). No implementa recuperación ni
 * generación de embeddings: reutiliza los servicios existentes.
 */

export interface ChatResult {
  sources: ChatSource[];
  hasContext: boolean;
  /** Respuesta en streaming. `null` cuando no hay contexto. */
  textStream: AsyncIterable<string> | null;
  fallbackMessage: string;
}

/** Flujo RAG con respuesta en streaming (usado por la app web). */
export async function generateChatResponse(
  query: string,
  history: ChatTurn[] = [],
): Promise<ChatResult> {
  const docs = await searchArticles(query);
  const { systemPrompt, sources, hasContext } = buildContext(docs);

  if (!hasContext) {
    return {
      sources: [],
      hasContext: false,
      textStream: null,
      fallbackMessage: NO_CONTEXT_MESSAGE,
    };
  }

  const messages: ChatTurn[] = [...history, { role: "user", content: query }];
  return {
    sources,
    hasContext: true,
    textStream: streamCompletion({ system: systemPrompt, messages }),
    fallbackMessage: "",
  };
}

export interface AnswerResult {
  answer: string;
  sources: ChatSource[];
  hasContext: boolean;
}

/**
 * Flujo RAG con respuesta completa (no streaming). Pensado para clientes que no
 * consumen streams, como el servidor MCP.
 */
export async function answerQuestion(
  query: string,
  history: ChatTurn[] = [],
): Promise<AnswerResult> {
  const docs = await searchArticles(query);
  const { systemPrompt, sources, hasContext } = buildContext(docs);

  if (!hasContext) {
    return { answer: NO_CONTEXT_MESSAGE, sources: [], hasContext: false };
  }

  const messages: ChatTurn[] = [...history, { role: "user", content: query }];
  const answer = await completeText({ system: systemPrompt, messages });
  return { answer, sources, hasContext: true };
}

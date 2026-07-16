import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { searchArticles } from "@/services/vector-search.service";
import { buildContext } from "@/services/context-builder.service";
import { ANTHROPIC_CHAT_MODEL, getAnthropicKey } from "@/lib/constants";
import { NO_CONTEXT_MESSAGE } from "@/lib/ai/prompts";
import type { ChatSource, ChatTurn } from "@/types/chat";

/**
 * Servicio conversacional (SOLO servidor). Orquesta el flujo RAG completo y es
 * el ÚNICO componente que se comunica con Claude. No implementa recuperación ni
 * generación de embeddings: reutiliza los servicios existentes.
 */

let anthropic: Anthropic | undefined;
function getClient(): Anthropic {
  if (!anthropic) anthropic = new Anthropic({ apiKey: getAnthropicKey() });
  return anthropic;
}

export interface ChatResult {
  sources: ChatSource[];
  hasContext: boolean;
  /** Texto de la respuesta en streaming. `null` cuando no hay contexto. */
  textStream: AsyncIterable<string> | null;
  /** Mensaje a mostrar cuando no hay contexto suficiente. */
  fallbackMessage: string;
}

/**
 * Ejecuta el flujo RAG: recuperación → contexto → generación con Claude.
 * Devuelve las fuentes (ya conocidas antes de generar) y un stream de texto.
 */
export async function generateChatResponse(
  query: string,
  history: ChatTurn[] = [],
): Promise<ChatResult> {
  // 1-2. Recuperar documentos relevantes (incluye el embedding de la consulta).
  const docs = await searchArticles(query);

  // 3. Construir el contexto y las fuentes.
  const { systemPrompt, sources, hasContext } = buildContext(docs);

  // 4. Sin contexto suficiente → no se invoca a Claude (evita alucinaciones).
  if (!hasContext) {
    return {
      sources: [],
      hasContext: false,
      textStream: null,
      fallbackMessage: NO_CONTEXT_MESSAGE,
    };
  }

  // 5. Generar la respuesta con Claude en streaming.
  const messages: Anthropic.MessageParam[] = [
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user" as const, content: query },
  ];

  const stream = getClient().messages.stream({
    model: ANTHROPIC_CHAT_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    // Respuesta directa y de baja latencia para el chat (sin razonamiento visible).
    thinking: { type: "disabled" },
    messages,
  });

  async function* textStream(): AsyncIterable<string> {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }

  return {
    sources,
    hasContext: true,
    textStream: textStream(),
    fallbackMessage: "",
  };
}

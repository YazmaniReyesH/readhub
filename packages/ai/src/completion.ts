import Anthropic from "@anthropic-ai/sdk";

import { ANTHROPIC_CHAT_MODEL, getAnthropicKey } from "@readhub/config";
import type { ChatTurn } from "@readhub/types";

let client: Anthropic | undefined;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: getAnthropicKey() });
  return client;
}

export interface CompletionInput {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
}

/**
 * Centraliza la llamada al LLM (Claude). Devuelve la respuesta en streaming.
 * Encapsula el proveedor para poder sustituirlo con impacto mínimo.
 */
export async function* streamCompletion(
  input: CompletionInput,
): AsyncIterable<string> {
  const stream = getClient().messages.stream({
    model: ANTHROPIC_CHAT_MODEL,
    max_tokens: input.maxTokens ?? 2048,
    system: input.system,
    thinking: { type: "disabled" },
    messages: input.messages.map((t) => ({ role: t.role, content: t.content })),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

/** Variante que devuelve el texto completo (no streaming) — útil para el MCP. */
export async function completeText(input: CompletionInput): Promise<string> {
  const message = await getClient().messages.create({
    model: ANTHROPIC_CHAT_MODEL,
    max_tokens: input.maxTokens ?? 2048,
    system: input.system,
    thinking: { type: "disabled" },
    messages: input.messages.map((t) => ({ role: t.role, content: t.content })),
  });
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

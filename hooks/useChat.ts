"use client";

import { useCallback, useRef, useState } from "react";

import type { ChatMessage, ChatSource, ChatTurn } from "@/types/chat";

/**
 * Gestiona la conversación con el asistente RAG: historial en memoria, envío de
 * consultas y renderizado progresivo (streaming) de la respuesta. Consume el
 * Route Handler /api/chat; no habla con Supabase ni con Claude directamente.
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<ChatTurn[]>([]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    historyRef.current = [];
  }, []);

  const sendMessage = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      if (!query || isStreaming) return;

      setError(null);
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: query,
      };
      const assistantId = crypto.randomUUID();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const history = historyRef.current.slice(-8);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, history }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Error ${res.status}`);
        }

        // Fuentes (cabecera X-Sources, JSON codificado con encodeURIComponent).
        let sources: ChatSource[] = [];
        const header = res.headers.get("X-Sources");
        if (header) {
          try {
            sources = JSON.parse(decodeURIComponent(header));
          } catch {
            sources = [];
          }
        }

        // Streaming del cuerpo (texto plano).
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let full = "";
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            full += decoder.decode(value, { stream: true });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: full } : m,
              ),
            );
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: full, sources } : m,
          ),
        );

        // Actualizar el historial para el contexto conversacional.
        historyRef.current = [
          ...historyRef.current,
          { role: "user" as const, content: query },
          { role: "assistant" as const, content: full },
        ].slice(-8);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al consultar el asistente.";
        setError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || `⚠️ ${message}` }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming],
  );

  return { messages, isStreaming, error, sendMessage, reset };
}

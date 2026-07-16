"use client";

import { useEffect, useRef } from "react";
import { Bot, Sparkles } from "lucide-react";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { LoadingMessage } from "@/components/chat/LoadingMessage";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";

const SUGGESTIONS = [
  "¿De qué trata el artículo sobre Next.js 15?",
  "¿Qué se dice sobre Row Level Security?",
  "Resume lo que hay sobre TypeScript",
];

/** Ventana conversacional completa del asistente RAG. */
export function ChatWindow() {
  const { messages, isStreaming, sendMessage } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Muestra el indicador de carga si aún no llegó texto del asistente.
  const lastMessage = messages[messages.length - 1];
  const waitingForFirstToken =
    isStreaming &&
    lastMessage?.role === "assistant" &&
    lastMessage.content === "";

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Asistente de ReadHub</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Pregunta lo que quieras sobre los artículos publicados. Responde
                usando solo el conocimiento de la plataforma y cita sus fuentes.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(s)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) =>
              waitingForFirstToken && m.id === lastMessage?.id ? null : (
                <ChatMessage key={m.id} message={m} />
              ),
            )}
            {waitingForFirstToken ? <LoadingMessage /> : null}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}

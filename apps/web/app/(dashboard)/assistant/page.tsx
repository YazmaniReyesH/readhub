"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MessageSquare, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Code-splitting: cada panel del asistente se carga solo cuando su pestaña se
// activa, en vez de incluir ambos en el JS inicial de la ruta. Son componentes
// de cliente (estado/streaming), por eso ssr: false.
const PanelSkeleton = () => <Skeleton className="h-[70vh] w-full rounded-xl" />;

const ChatWindow = dynamic(
  () => import("@/components/chat/ChatWindow").then((m) => m.ChatWindow),
  { ssr: false, loading: PanelSkeleton },
);
const SemanticSearch = dynamic(
  () => import("@/components/search/SemanticSearch").then((m) => m.SemanticSearch),
  { ssr: false, loading: PanelSkeleton },
);

type Tab = "chat" | "search";

export default function AssistantPage() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Asistente</h1>
        <p className="text-sm text-muted-foreground">
          Consulta el conocimiento de ReadHub mediante lenguaje natural. Las
          respuestas se basan únicamente en los artículos publicados.
        </p>
      </div>

      <div className="inline-flex gap-1 rounded-lg border p-1">
        <Button
          variant={tab === "chat" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("chat")}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
        <Button
          variant={tab === "search" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("search")}
        >
          <Search className="h-4 w-4" />
          Búsqueda semántica
        </Button>
      </div>

      {tab === "chat" ? <ChatWindow /> : <SemanticSearch />}
    </div>
  );
}

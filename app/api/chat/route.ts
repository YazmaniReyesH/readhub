import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateChatResponse } from "@/services/chat.service";
import type { ChatTurn } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint del asistente RAG. Recupera contexto y transmite (streaming) la
 * respuesta de Claude. Las fuentes viajan en la cabecera `X-Sources`
 * (JSON codificado con encodeURIComponent).
 */
export async function POST(request: NextRequest) {
  // Autenticación: el asistente es solo para usuarios con sesión.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let query: string;
  let history: ChatTurn[];
  try {
    const body = await request.json();
    query = typeof body.query === "string" ? body.query.trim() : "";
    history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json(
      { error: "La consulta no puede estar vacía." },
      { status: 422 },
    );
  }

  let result;
  try {
    result = await generateChatResponse(query, history);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error del asistente." },
      { status: 500 },
    );
  }

  const sourcesHeader = encodeURIComponent(JSON.stringify(result.sources));

  // Sin contexto: se responde con el mensaje de respaldo (sin llamar a Claude).
  if (!result.hasContext || !result.textStream) {
    return new Response(result.fallbackMessage, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Sources": sourcesHeader,
        "Cache-Control": "no-store",
      },
    });
  }

  const encoder = new TextEncoder();
  const textStream = result.textStream;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        controller.enqueue(
          encoder.encode("\n\n[Se interrumpió la generación de la respuesta.]"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Sources": sourcesHeader,
      "Cache-Control": "no-store",
    },
  });
}

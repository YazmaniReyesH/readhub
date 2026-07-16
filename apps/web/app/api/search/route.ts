import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { searchArticles } from "@readhub/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Búsqueda semántica: devuelve los artículos más relevantes para una consulta. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let query: string;
  try {
    const body = await request.json();
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json(
      { error: "La consulta no puede estar vacía." },
      { status: 422 },
    );
  }

  try {
    const docs = await searchArticles(query);
    const results = docs.map((d) => ({
      articleId: d.article_id,
      title: d.title,
      summary: d.summary,
      authorName: d.author_name,
      similarity: d.similarity,
    }));
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error en la búsqueda." },
      { status: 500 },
    );
  }
}

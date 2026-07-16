import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { indexArticle, removeArticleEmbedding } from "@/services/embedding.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verifica que el usuario autenticado sea el autor del artículo (o admin). */
async function assertOwnership(
  userId: string,
  articleId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const admin = createAdminClient();
  const { data: article } = await admin
    .from("articles")
    .select("author_id")
    .eq("id", articleId)
    .maybeSingle();
  if (!article) return { ok: false, status: 404, error: "Artículo no encontrado." };

  if (article.author_id !== userId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return { ok: false, status: 403, error: "No autorizado." };
    }
  }
  return { ok: true };
}

/** Indexa (o reindexa) un artículo en la base vectorial. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let articleId: string;
  try {
    const body = await request.json();
    articleId = typeof body.articleId === "string" ? body.articleId : "";
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!articleId) {
    return NextResponse.json({ error: "Falta articleId." }, { status: 422 });
  }

  const ownership = await assertOwnership(user.id, articleId);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  try {
    const result = await indexArticle(articleId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al indexar." },
      { status: 500 },
    );
  }
}

/** Elimina el embedding de un artículo (evita vectores huérfanos). */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let articleId: string;
  try {
    const body = await request.json();
    articleId = typeof body.articleId === "string" ? body.articleId : "";
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!articleId) {
    return NextResponse.json({ error: "Falta articleId." }, { status: 422 });
  }

  const ownership = await assertOwnership(user.id, articleId);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  try {
    await removeArticleEmbedding(articleId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al eliminar." },
      { status: 500 },
    );
  }
}

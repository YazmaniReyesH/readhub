import { createAdminClient } from "./admin";
import type { ArticleWithStats } from "@readhub/types";

/**
 * Acceso a artículos apto para el servidor (service_role, sin cookies).
 * Reutilizado por el servidor MCP. Solo expone artículos públicos.
 */

export interface ArticleListItem {
  id: string;
  title: string;
  summary: string | null;
  author_name: string | null;
  created_at: string;
}

/** Lista los artículos públicos (con autor y conteos), más recientes primero. */
export async function listArticles(limit = 20): Promise<ArticleWithStats[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_articles_feed");
  if (error) throw new Error(error.message);
  return (data ?? []).slice(0, limit);
}

/** Obtiene un artículo público por id (o null). */
export async function getArticleById(
  id: string,
): Promise<ArticleWithStats | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_article_detail", {
    p_article_id: id,
  });
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? data[0] : null;
}

/** Búsqueda por palabra clave (título/resumen) sobre artículos públicos. */
export async function searchArticlesByText(
  query: string,
  limit = 10,
): Promise<ArticleListItem[]> {
  const admin = createAdminClient();
  const term = query.replace(/[%,]/g, " ").trim();
  const { data, error } = await admin
    .from("articles")
    .select("id, title, summary, created_at, profiles!articles_author_id_fkey(full_name)")
    .eq("is_public", true)
    .or(`title.ilike.%${term}%,summary.ilike.%${term}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const profile = row.profiles as { full_name: string | null } | null;
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      author_name: profile?.full_name ?? null,
      created_at: row.created_at,
    };
  });
}

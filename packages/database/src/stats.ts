import { createAdminClient } from "./admin";

export interface PlatformStats {
  articles: number;
  authors: number;
  views: number;
  likes: number;
  comments: number;
}

async function countRows(
  table: "articles" | "profiles" | "views" | "likes" | "comments",
): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Estadísticas globales de la plataforma (para el Resource de estadísticas). */
export async function getPlatformStats(): Promise<PlatformStats> {
  const [articles, authors, views, likes, comments] = await Promise.all([
    countRows("articles"),
    countRows("profiles"),
    countRows("views"),
    countRows("likes"),
    countRows("comments"),
  ]);
  return { articles, authors, views, likes, comments };
}

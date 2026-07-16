import { createAdminClient } from "./admin";

export interface AuthorInfo {
  id: string;
  name: string | null;
  role: string;
  articleCount: number;
}

/** Lista los autores (perfiles con rol writer/admin) y su nº de artículos públicos. */
export async function listAuthors(): Promise<AuthorInfo[]> {
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["writer", "admin"]);
  if (error) throw new Error(error.message);

  const { data: articles, error: aErr } = await admin
    .from("articles")
    .select("author_id")
    .eq("is_public", true);
  if (aErr) throw new Error(aErr.message);

  const counts = new Map<string, number>();
  for (const a of articles ?? []) {
    counts.set(a.author_id, (counts.get(a.author_id) ?? 0) + 1);
  }

  return (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role,
    articleCount: counts.get(p.id) ?? 0,
  }));
}

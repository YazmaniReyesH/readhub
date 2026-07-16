"use client";

import { useCallback, useState } from "react";

export interface SearchResultItem {
  articleId: string;
  title: string;
  summary: string | null;
  authorName: string | null;
  similarity: number;
}

/**
 * Búsqueda semántica de artículos. Consume el Route Handler /api/search.
 */
export function useSemanticSearch() {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en la búsqueda.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, hasSearched, search };
}

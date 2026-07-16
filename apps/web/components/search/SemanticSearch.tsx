"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState } from "@/components/layout/states";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";

/** Buscador semántico de artículos (usa embeddings + similitud vectorial). */
export function SemanticSearch() {
  const { results, loading, error, hasSearched, search } = useSemanticSearch();
  const [value, setValue] = useState("");

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(value);
        }}
        className="flex gap-2"
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Busca por significado, no solo por palabras…"
        />
        <Button type="submit" disabled={loading || !value.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Buscar
        </Button>
      </form>

      {error ? (
        <ErrorState message={error} onRetry={() => search(value)} />
      ) : hasSearched && !loading && results.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="No se encontraron artículos relevantes para esa búsqueda."
        />
      ) : (
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r.articleId}>
              <Link
                href={`/article/${r.articleId}`}
                className="block rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{r.title}</h3>
                  <Badge variant="secondary" className="shrink-0">
                    {Math.round(r.similarity * 100)}%
                  </Badge>
                </div>
                {r.summary ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {r.summary}
                  </p>
                ) : null}
                {r.authorName ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.authorName}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

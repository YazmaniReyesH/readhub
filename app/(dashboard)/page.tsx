"use client";

import Link from "next/link";
import { PenSquare } from "lucide-react";

import { ArticleCard } from "@/components/cards/article-card";
import { EmptyState, ErrorState } from "@/components/layout/states";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArticlesFeed } from "@/hooks/useArticles";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { articles, loading, error, refresh } = useArticlesFeed();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Artículos</h1>
          <p className="text-sm text-muted-foreground">
            Descubre lo que la comunidad está publicando.
          </p>
        </div>
        <Link
          href="/upload"
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
        >
          <PenSquare className="h-4 w-4" />
          Cargar artículo
        </Link>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : articles.length === 0 ? (
        <EmptyState
          title="Aún no hay publicaciones disponibles"
          description="Sé el primero en compartir un artículo con la comunidad."
          action={
            <Link href="/upload" className={cn(buttonVariants({ size: "sm" }))}>
              <PenSquare className="h-4 w-4" />
              Publicar artículo
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

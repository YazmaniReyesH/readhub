"use client";

import Link from "next/link";
import { Eye, Heart, MessageCircle } from "lucide-react";

import { CoverImage } from "@/components/articles/cover-image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { getCoverPublicUrl } from "@/services/storage.service";
import type { ArticleWithStats } from "@/types/database";
import { formatDate, formatNumber } from "@/lib/utils";

/** Tarjeta de artículo para el listado de la página principal. */
export function ArticleCard({ article }: { article: ArticleWithStats }) {
  const coverUrl = getCoverPublicUrl(article.image_path);

  return (
    <Link href={`/article/${article.id}`} className="group block">
      <Card className="h-full overflow-hidden pt-0 transition-shadow hover:shadow-md">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          <CoverImage
            src={coverUrl}
            alt={article.title}
            sizes="(max-width: 768px) 100vw, 400px"
            className="transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {article.author_name ?? "Autor"}
            </span>
            <span aria-hidden>·</span>
            <time dateTime={article.created_at}>
              {formatDate(article.created_at)}
            </time>
          </div>
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug group-hover:text-primary">
            {article.title}
          </h3>
          {article.summary ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {article.summary}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatNumber(article.views_count)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            {formatNumber(article.likes_count)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            {formatNumber(article.comments_count)}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

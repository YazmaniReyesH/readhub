"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { ArticleEditForm } from "@/components/forms/article-edit-form";
import { EmptyState, LoadingState } from "@/components/layout/states";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getArticleById } from "@/services/article.service";
import { cn } from "@/lib/utils";
import type { ArticleWithStats } from "@readhub/types";

export default function EditArticlePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, profile, loading: authLoading } = useAuth();

  const [article, setArticle] = useState<ArticleWithStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getArticleById(id)
      .then((a) => {
        if (active) setArticle(a);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading || authLoading) return <LoadingState label="Cargando artículo…" />;

  const canEdit =
    article && user && (article.author_id === user.id || profile?.role === "admin");

  if (!article || !canEdit) {
    return (
      <EmptyState
        title="No puedes editar este artículo"
        description="El artículo no existe o no eres su autor."
        action={
          <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
            Volver al inicio
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/article/${id}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al artículo
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Editar artículo</h1>
        <p className="text-sm text-muted-foreground">
          Actualiza el título, la visibilidad o reemplaza el documento/imagen.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ArticleEditForm article={article} />
      </div>
    </div>
  );
}

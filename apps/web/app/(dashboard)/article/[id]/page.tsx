"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Lock, Pencil } from "lucide-react";

import { ArticleContent } from "@/components/articles/article-content";
import { CoverImage } from "@/components/articles/cover-image";
import { LikeButton } from "@/components/articles/like-button";
import { CommentForm } from "@/components/comments/comment-form";
import { CommentList } from "@/components/comments/comment-list";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/layout/states";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useArticle } from "@/hooks/useArticles";
import { useComments } from "@/hooks/useComments";
import { getCoverPublicUrl } from "@/services/storage.service";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, profile } = useAuth();

  const { article, loading, error, refresh } = useArticle(id, user?.id ?? null);
  const {
    comments,
    loading: commentsLoading,
    submitting,
    addComment,
  } = useComments(id);

  if (loading) return <LoadingState label="Cargando artículo…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!article) {
    return (
      <EmptyState
        title="Artículo no encontrado"
        description="El artículo no existe o no tienes permiso para verlo."
        action={
          <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
            Volver al inicio
          </Link>
        }
      />
    );
  }

  const coverUrl = getCoverPublicUrl(article.image_path);

  async function handleAddComment(text: string) {
    if (!user) return;
    await addComment(user.id, text);
  }

  const canEdit =
    user && (article.author_id === user.id || profile?.role === "admin");

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
        {canEdit ? (
          <Link
            href={`/article/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Link>
        ) : null}
      </div>

      <header className="space-y-4">
        <div className="flex items-start gap-3">
          <h1 className="flex-1 text-3xl font-bold leading-tight tracking-tight">
            {article.title}
          </h1>
          {!article.is_public ? (
            <Badge variant="secondary" className="mt-1 shrink-0">
              <Lock className="h-3.5 w-3.5" />
              Privado
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {article.author_name ?? "Autor"}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={article.created_at}>
            {formatDate(article.created_at)}
          </time>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatNumber(article.views_count)} vistas
          </span>
        </div>
      </header>

      {article.image_path ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
          <CoverImage
            src={coverUrl}
            alt={article.title}
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <LikeButton articleId={article.id} userId={user?.id ?? null} />
      </div>

      <Separator />

      <ArticleContent documentPath={article.document_path} />

      <Separator />

      {/* Comentarios */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">
          Comentarios{" "}
          <span className="text-muted-foreground">
            ({formatNumber(comments.length)})
          </span>
        </h2>

        <CommentForm onSubmit={handleAddComment} submitting={submitting} />

        {commentsLoading ? (
          <LoadingState label="Cargando comentarios…" />
        ) : (
          <CommentList comments={comments} />
        )}
      </section>
    </article>
  );
}

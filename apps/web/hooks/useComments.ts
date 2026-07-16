"use client";

import { useCallback, useEffect, useState } from "react";

import * as commentService from "@/services/comment.service";
import { validateComment } from "@/lib/validators/article";
import type { CommentWithAuthor } from "@readhub/types";

/**
 * Gestiona los comentarios de un artículo: carga la lista y permite crear
 * nuevos, actualizando la lista sin recargar la página (Flujo 7).
 */
export function useComments(articleId: string) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setComments(await commentService.getArticleComments(articleId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar los comentarios.",
      );
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Crea un comentario. Valida (BR-017) y refresca la lista. */
  const addComment = useCallback(
    async (userId: string, text: string) => {
      const result = validateComment(text);
      if (!result.valid) throw new Error(result.message);
      setSubmitting(true);
      try {
        await commentService.createComment(articleId, userId, text);
        await refresh();
      } finally {
        setSubmitting(false);
      }
    },
    [articleId, refresh],
  );

  return { comments, loading, submitting, error, addComment, refresh };
}

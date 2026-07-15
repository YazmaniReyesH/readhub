"use client";

import { useCallback, useEffect, useState } from "react";

import * as articleService from "@/services/article.service";

/**
 * Gestiona los "Me gusta" de un artículo: conteo, si el usuario ya reaccionó,
 * y el alternado (like/unlike) respetando BR-013 (un like por usuario).
 */
export function useLikes(articleId: string, userId: string | null) {
  const [count, setCount] = useState(0);
  const [likedByUser, setLikedByUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const state = await articleService.getLikeState(articleId, userId);
      setCount(state.count);
      setLikedByUser(state.likedByUser);
    } finally {
      setLoading(false);
    }
  }, [articleId, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Alterna el like del usuario autenticado. */
  const toggleLike = useCallback(async () => {
    if (!userId || pending) return;
    setPending(true);
    // Actualización optimista.
    const wasLiked = likedByUser;
    setLikedByUser(!wasLiked);
    setCount((c) => c + (wasLiked ? -1 : 1));
    try {
      if (wasLiked) {
        await articleService.removeLike(articleId, userId);
      } else {
        await articleService.addLike(articleId, userId);
      }
    } catch {
      // Revierte si falla.
      setLikedByUser(wasLiked);
      setCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setPending(false);
    }
  }, [articleId, userId, likedByUser, pending]);

  return { count, likedByUser, loading, pending, toggleLike, refresh };
}

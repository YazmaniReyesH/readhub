"use client";

import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLikes } from "@/hooks/useLikes";
import { cn, formatNumber } from "@/lib/utils";

/** Botón de "Me gusta" con conteo. Un like por usuario (BR-013). */
export function LikeButton({
  articleId,
  userId,
}: {
  articleId: string;
  userId: string | null;
}) {
  const { count, likedByUser, loading, pending, toggleLike } = useLikes(
    articleId,
    userId,
  );

  return (
    <Button
      type="button"
      variant={likedByUser ? "default" : "outline"}
      size="sm"
      disabled={loading || pending || !userId}
      onClick={toggleLike}
      aria-pressed={likedByUser}
      title={userId ? "Me gusta" : "Inicia sesión para reaccionar"}
    >
      <Heart className={cn("h-4 w-4", likedByUser && "fill-current")} />
      {formatNumber(count)}
    </Button>
  );
}

import type { CommentWithAuthor, Tables } from "@/types/database";

/** Comentario (tabla `public.comments`). */
export type Comment = Tables<"comments">;

/** Comentario enriquecido con el nombre del autor (para la vista de detalle). */
export type { CommentWithAuthor };

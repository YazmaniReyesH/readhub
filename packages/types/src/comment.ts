import type { Tables } from "./database";

/** Comentario (tabla `public.comments`). */
export type Comment = Tables<"comments">;

/** Comentario enriquecido con el nombre del autor (para la vista de detalle). */

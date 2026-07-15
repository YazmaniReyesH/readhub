import type { Tables } from "@/types/database";

/** Artículo (tabla `public.articles`). */
export type Article = Tables<"articles">;

/** Registro de visualización (tabla `public.views`). */
export type ArticleView = Tables<"views">;

/** "Me gusta" (tabla `public.likes`). */
export type Like = Tables<"likes">;

/** Favorito (tabla `public.favorites`). */
export type Favorite = Tables<"favorites">;

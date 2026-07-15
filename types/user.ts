import type { Tables, UserRole } from "@/types/database";

/** Perfil de usuario (tabla `public.profiles`, 1:1 con `auth.users`). */
export type Profile = Tables<"profiles">;

export type { UserRole };

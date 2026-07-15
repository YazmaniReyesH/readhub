import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/constants";

/**
 * Cliente de Supabase para componentes del navegador (Client Components).
 *
 * Utiliza únicamente claves públicas (`NEXT_PUBLIC_*`) y respeta las
 * políticas RLS definidas en la base de datos.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}

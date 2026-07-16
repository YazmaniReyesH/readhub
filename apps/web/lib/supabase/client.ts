import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@readhub/types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@readhub/config";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Cliente de Supabase para el navegador (Client Components).
 *
 * Devuelve una única instancia (singleton) para compartir el estado de sesión
 * entre el listener de autenticación y la capa de servicios. Usa solo claves
 * públicas (`NEXT_PUBLIC_*`) y respeta las políticas RLS.
 */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
  );
  return browserClient;
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/constants";

let adminClient: SupabaseClient<Database> | undefined;

/**
 * Cliente de Supabase con service_role. SOLO para uso en el servidor
 * (Route Handlers / scripts). Omite las políticas RLS, por lo que nunca debe
 * exponerse al navegador. Se usa para indexar embeddings y ejecutar las
 * funciones RPC del sistema RAG.
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (adminClient) return adminClient;
  adminClient = createSupabaseClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return adminClient;
}

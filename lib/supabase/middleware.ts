import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/constants";

/**
 * Refresca la sesión de Supabase en cada petición y sincroniza las cookies
 * de autenticación entre la petición y la respuesta.
 *
 * En esta etapa (infraestructura) el middleware únicamente mantiene la sesión
 * viva. La protección de rutas privadas se implementará en la sesión de
 * autenticación, sin necesidad de reestructurar este archivo.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Antes de configurar `.env.local`, no hay a qué conectarse: el middleware
  // deja pasar la petición sin intentar refrescar la sesión.
  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no colocar código entre `createServerClient` y `getUser()`.
  // `getUser()` revalida el token de autenticación con el servidor de Supabase.
  await supabase.auth.getUser();

  return supabaseResponse;
}

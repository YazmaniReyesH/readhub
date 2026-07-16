import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@readhub/types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@readhub/config";

/**
 * Cliente de Supabase para el servidor (Server Components, Route Handlers,
 * Server Actions).
 *
 * Lee y escribe la sesión desde las cookies de la petición. En Next.js 15
 * `cookies()` es asíncrono, por lo que esta función devuelve una promesa.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` puede invocarse desde un Server Component, donde no está
          // permitido escribir cookies. El refresco de sesión se realiza en el
          // middleware, por lo que este caso puede ignorarse con seguridad.
        }
      },
    },
  });
}

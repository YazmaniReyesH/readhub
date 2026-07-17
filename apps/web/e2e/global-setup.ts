import { createClient } from "@supabase/supabase-js";

import { seededUser } from "./fixtures/users";

/**
 * Global setup de Playwright: garantiza que el usuario de E2E exista y pueda
 * autenticarse en el Supabase que se esté probando (local efímero en CI, o el
 * proyecto de desarrollo en local).
 *
 * Por qué por Admin API y no solo por seed.sql:
 *   Insertar filas en `auth.users` a mano NO produce un usuario que GoTrue
 *   acepte en `signInWithPassword` de forma fiable (el hash/estado interno que
 *   espera Auth no queda igual que en un alta real). Crear el usuario con la
 *   Admin API recorre exactamente el mismo camino que un registro real, así que
 *   el login del test siempre funciona. Es idempotente: si ya existe, solo
 *   reafirma la contraseña, la confirmación de correo y los metadatos.
 */
async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para el " +
        "global setup de E2E. En CI los inyecta el workflow; en local ponlos " +
        "en apps/web/.env.local.",
    );
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userMetadata = {
    full_name: seededUser.displayName,
    birth_date: "1995-04-12",
    phone: "3001112233",
    role: "writer",
  };

  const { error: createError } = await admin.auth.admin.createUser({
    email: seededUser.email,
    password: seededUser.password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (!createError) return;

  // Ya existía (re-ejecución local, o carrera): búscalo y reafirma su estado.
  const target = seededUser.email.toLowerCase();
  let existingId: string | undefined;
  for (let page = 1; page <= 20 && !existingId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    existingId = data.users.find((u) => u.email?.toLowerCase() === target)?.id;
    if (data.users.length < 200) break;
  }

  if (!existingId) {
    throw new Error(
      `No se pudo crear ni encontrar el usuario E2E (${seededUser.email}): ${createError.message}`,
    );
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    existingId,
    {
      password: seededUser.password,
      email_confirm: true,
      user_metadata: userMetadata,
    },
  );
  if (updateError) {
    throw new Error(
      `No se pudo actualizar el usuario E2E (${seededUser.email}): ${updateError.message}`,
    );
  }
}

export default globalSetup;

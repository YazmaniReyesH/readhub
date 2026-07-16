import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { LoginInput, RegisterInput } from "@/lib/validators/auth";
import type { Profile } from "@readhub/types";

/**
 * Capa de acceso a Supabase Auth y a la tabla `profiles`.
 * Es el ÚNICO lugar donde el frontend habla con Supabase para autenticación.
 */

/** Traduce los mensajes de error de Supabase a mensajes claros en español. */
function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "El correo electrónico ya se encuentra registrado.";
  }
  if (m.includes("email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesión.";
  }
  if (m.includes("password should be at least")) {
    return "La contraseña es demasiado corta.";
  }
  return message;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

/** Registra un usuario nuevo. Los datos de perfil viajan en `options.data`. */
export async function signUp(input: RegisterInput): Promise<AuthResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
        birth_date: input.birth_date,
        phone: input.phone,
        role: "writer",
      },
    },
  });
  if (error) throw new Error(mapAuthError(error.message));
  return { user: data.user, session: data.session };
}

/** Inicia sesión con correo y contraseña. */
export async function signIn(input: LoginInput): Promise<AuthResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw new Error(mapAuthError(error.message));
  return { user: data.user, session: data.session };
}

/** Cierra la sesión activa. */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(mapAuthError(error.message));
}

/** Devuelve el usuario autenticado (revalidado con el servidor) o null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Suscribe a los cambios de estado de autenticación. Devuelve la suscripción. */
export function subscribeToAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): Subscription {
  const supabase = createClient();
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}

/** Devuelve el perfil (tabla profiles) del usuario indicado. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

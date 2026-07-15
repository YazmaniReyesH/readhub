"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";

import * as authService from "@/services/auth.service";
import type { LoginInput, RegisterInput } from "@/lib/validators/auth";
import type { Profile } from "@/types/user";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  /** Nombre visible del usuario (full_name, o el correo como respaldo). */
  displayName: string;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  /** Devuelve `needsConfirmation: true` si Supabase exige confirmar el correo. */
  register: (input: RegisterInput) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Proveedor de autenticación. Mantiene el usuario y su perfil en estado,
 * escuchando los cambios de sesión de Supabase mediante la capa de servicios.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await authService.getProfile(nextUser.id));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Estado inicial.
    authService
      .getCurrentUser()
      .then(async (currentUser) => {
        if (!active) return;
        setUser(currentUser);
        await loadProfile(currentUser);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Cambios de sesión (login, logout, refresh...).
    const subscription = authService.subscribeToAuthChanges(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        void loadProfile(nextUser);
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(async (input: LoginInput) => {
    await authService.signIn(input);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { session } = await authService.signUp(input);
    return { needsConfirmation: session === null };
  }, []);

  const logout = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const displayName = useMemo(
    () => profile?.full_name ?? user?.email ?? "Usuario",
    [profile, user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, displayName, loading, login, register, logout }),
    [user, profile, displayName, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para consumir el estado y las acciones de autenticación. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  }
  return context;
}

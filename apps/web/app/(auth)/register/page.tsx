import type { Metadata } from "next";

import { AuthForm } from "@/components/forms/auth-form";

export const metadata: Metadata = { title: "Registrarse" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Regístrate para empezar a compartir tus artículos.
        </p>
      </div>
      <AuthForm initialMode="register" />
    </div>
  );
}

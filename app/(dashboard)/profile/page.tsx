"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Mail, Phone, Calendar, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/layout/states";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfilePage() {
  const { user, profile, displayName, loading, logout } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      toast.success("Sesión cerrada correctamente.");
      router.replace("/login");
    } catch {
      toast.error("No se pudo cerrar la sesión.");
      setSigningOut(false);
    }
  }

  if (loading) return <LoadingState label="Cargando perfil…" />;

  const rows = [
    { icon: Mail, label: "Correo", value: user?.email ?? "—" },
    {
      icon: Calendar,
      label: "Fecha de nacimiento",
      value: profile?.birth_date ? formatDate(profile.birth_date) : "—",
    },
    { icon: Phone, label: "Celular", value: profile?.phone ?? "—" },
    {
      icon: Calendar,
      label: "Miembro desde",
      value: profile?.created_at ? formatDate(profile.created_at) : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{displayName}</h2>
            {profile?.role ? (
              <Badge variant="secondary" className="capitalize">
                <ShieldCheck className="h-3.5 w-3.5" />
                {profile.role}
              </Badge>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 divide-y">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-3 py-3 text-sm"
            >
              <row.icon className="h-4 w-4 text-muted-foreground" />
              <dt className="w-40 text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 border-t pt-6">
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={signingOut}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Home, LogOut, PenSquare, User } from "lucide-react";
import { toast } from "sonner";

import { Brand } from "@/components/layout/brand";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { displayName, logout } = useAuth();
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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Brand />

        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Enlaces visibles en escritorio */}
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            <Home className="h-4 w-4" />
            Inicio
          </Link>
          <Link
            href="/upload"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            <PenSquare className="h-4 w-4" />
            Cargar artículo
          </Link>

          {/* Menú de usuario (siempre visible) */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <User className="h-4 w-4" />
              <span className="max-w-[8rem] truncate">{displayName}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {displayName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Enlaces también en el menú (útil en móvil) */}
              <DropdownMenuItem render={<Link href="/" />} className="sm:hidden">
                <Home className="h-4 w-4" />
                Inicio
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/upload" />}
                className="sm:hidden"
              >
                <PenSquare className="h-4 w-4" />
                Cargar artículo
              </DropdownMenuItem>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem
                variant="destructive"
                disabled={signingOut}
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}

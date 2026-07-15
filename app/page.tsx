import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

/**
 * Página de inicio provisional (Etapa 2 — Infraestructura).
 *
 * Las pantallas y funcionalidades de dominio (autenticación, listado y
 * publicación de artículos, etc.) se implementarán en sesiones posteriores.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="max-w-md text-muted-foreground">{APP_DESCRIPTION}</p>
      <p className="text-sm text-muted-foreground">
        Infraestructura base lista. Las funcionalidades se añadirán en las
        siguientes etapas.
      </p>
    </main>
  );
}

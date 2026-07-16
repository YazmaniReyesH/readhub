import { Brand } from "@/components/layout/brand";
import { APP_DESCRIPTION } from "@readhub/config";

/** Layout de las pantallas de autenticación: tarjeta centrada con la marca. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Brand href="/login" />
          <p className="text-sm text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

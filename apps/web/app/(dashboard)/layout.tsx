import { Navbar } from "@/components/navigation/navbar";

/** Layout compartido de las pantallas privadas: barra de navegación + contenido. */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

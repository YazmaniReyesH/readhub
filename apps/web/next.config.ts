import path from "node:path";
import type { NextConfig } from "next";

// Host del proyecto de Supabase, derivado de la URL pública, para autorizar la
// carga de imágenes de portada (bucket público) mediante next/image.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Raíz del monorepo: evita el warning de múltiples lockfiles y acota el
  // rastreo de archivos a la raíz correcta.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // unpdf (extracción de texto de PDF) se ejecuta en el servidor; no bundlear.
  serverExternalPackages: ["unpdf"],
  // Paquetes compartidos del monorepo (TypeScript sin precompilar).
  transpilePackages: [
    "@readhub/types",
    "@readhub/config",
    "@readhub/database",
    "@readhub/ai",
    "@readhub/shared",
  ],
  // Optimiza los imports de barril de librerías de UI: Next solo incluye en el
  // bundle los símbolos realmente usados (menos JS enviado al cliente).
  // lucide-react ya viene optimizado por defecto en Next 15; añadimos base-ui.
  experimental: {
    optimizePackageImports: ["@base-ui/react", "lucide-react"],
  },
  images: {
    // Sirve las portadas en formatos modernos (AVIF/WebP) cuando el navegador
    // los soporta: imágenes más ligeras => mejor LCP y menor transferencia.
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;

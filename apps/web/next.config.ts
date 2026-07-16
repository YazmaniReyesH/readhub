import type { NextConfig } from "next";

// Host del proyecto de Supabase, derivado de la URL pública, para autorizar la
// carga de imágenes de portada (bucket público) mediante next/image.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Paquetes compartidos del monorepo (TypeScript sin precompilar).
  transpilePackages: [
    "@readhub/types",
    "@readhub/config",
    "@readhub/database",
    "@readhub/ai",
    "@readhub/shared",
  ],
  images: {
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

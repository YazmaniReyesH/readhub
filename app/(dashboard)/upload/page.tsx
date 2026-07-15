import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ArticleForm } from "@/components/forms/article-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cargar artículo" };

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-ml-2",
        )}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Publicar artículo</h1>
        <p className="text-sm text-muted-foreground">
          Sube tu documento (TXT, DOCX o PDF) y una imagen de portada.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ArticleForm />
      </div>
    </div>
  );
}

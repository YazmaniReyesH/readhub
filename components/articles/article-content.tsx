"use client";

import { Download, FileText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/layout/states";
import { useArticleDocument } from "@/hooks/useArticles";
import { cn } from "@/lib/utils";

/**
 * Muestra el contenido del documento del artículo:
 *  - TXT: se renderiza como texto.
 *  - PDF: se embebe en un visor.
 *  - DOCX / otros: se ofrece un enlace de descarga (no hay visor nativo).
 */
export function ArticleContent({
  documentPath,
}: {
  documentPath: string | null;
}) {
  const { kind, text, url, loading, error } = useArticleDocument(documentPath);

  if (loading) return <LoadingState label="Cargando documento…" />;
  if (error) return <ErrorState message={error} />;

  if (kind === "txt" && text !== null) {
    return (
      <article className="text-[1.05rem] leading-relaxed whitespace-pre-wrap">
        {text}
      </article>
    );
  }

  if (kind === "pdf" && url) {
    return (
      <div className="space-y-3">
        <iframe
          src={url}
          title="Documento PDF"
          className="h-[75vh] w-full rounded-lg border"
        />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Download className="h-4 w-4" />
          Descargar PDF
        </a>
      </div>
    );
  }

  if (url) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Este documento no se puede previsualizar en el navegador.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          <Download className="h-4 w-4" />
          Descargar documento
        </a>
      </div>
    );
  }

  return (
    <p className="py-6 text-center text-sm text-muted-foreground">
      Este artículo no tiene un documento asociado.
    </p>
  );
}

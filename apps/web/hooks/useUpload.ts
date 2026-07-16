"use client";

import { useCallback, useState } from "react";

import * as storageService from "@/services/storage.service";
import { getFileExtension } from "@/lib/validators/article";

/** Extrae un resumen a partir del documento (BR-010). */
async function deriveSummary(document: File): Promise<string> {
  const ext = getFileExtension(document.name);
  if (ext === "txt") {
    try {
      const text = await document.text();
      const firstParagraph =
        text
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .find((p) => p.length > 0) ?? text.trim();
      return firstParagraph.slice(0, 300);
    } catch {
      // Si no se puede leer, usa el respaldo.
    }
  }
  return "Documento disponible. Ábrelo para leer el contenido completo.";
}

export interface UploadedArticleFiles {
  documentPath: string;
  imagePath: string;
  summary: string;
}

/**
 * Sube el documento y la imagen de portada a Supabase Storage y calcula el
 * resumen del artículo. Toda la interacción con Storage pasa por el service.
 */
export function useUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadArticleFiles = useCallback(
    async (
      userId: string,
      document: File,
      image: File,
    ): Promise<UploadedArticleFiles> => {
      setUploading(true);
      try {
        const summary = await deriveSummary(document);
        const documentPath = await storageService.uploadDocument(
          userId,
          document,
        );
        const imagePath = await storageService.uploadCover(userId, image);
        return { documentPath, imagePath, summary };
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  return { uploadArticleFiles, uploading };
}

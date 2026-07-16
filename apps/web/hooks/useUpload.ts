"use client";

import { useCallback, useState } from "react";

import * as storageService from "@/services/storage.service";
import { getFileExtension } from "@/lib/validators/article";
import { DOCUMENT_SUMMARY_PLACEHOLDER, deriveSummary } from "@readhub/config";

/**
 * Resumen provisional a partir del documento (BR-010).
 * Para TXT extrae el primer párrafo en el cliente. Para PDF/DOCX usa un
 * placeholder; el resumen real se deriva en el servidor durante la indexación
 * (que sí extrae el texto del PDF).
 */
async function deriveDocumentSummary(document: File): Promise<string> {
  const ext = getFileExtension(document.name);
  if (ext === "txt") {
    try {
      return deriveSummary(await document.text());
    } catch {
      // Si no se puede leer, usa el respaldo.
    }
  }
  return DOCUMENT_SUMMARY_PLACEHOLDER;
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
        const summary = await deriveDocumentSummary(document);
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

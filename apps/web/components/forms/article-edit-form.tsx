"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VisibilityField } from "@/components/forms/visibility-field";
import { useAuth } from "@/hooks/useAuth";
import * as storageService from "@/services/storage.service";
import { requestArticleIndex, updateArticle } from "@/services/article.service";
import {
  getFileExtension,
  validateDocument,
  validateImage,
  validateTitle,
} from "@/lib/validators/article";
import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  DOCUMENT_SUMMARY_PLACEHOLDER,
  deriveSummary,
} from "@readhub/config";
import type { ArticleWithStats } from "@readhub/types";

type Errors = { title?: string; document?: string; image?: string };

/** Formulario de edición de un artículo. Documento e imagen son opcionales. */
export function ArticleEditForm({ article }: { article: ArticleWithStats }) {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState(article.title);
  const [isPublic, setIsPublic] = useState(article.is_public);
  const [document, setDocument] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    const nextErrors: Errors = {};
    const titleResult = validateTitle(title);
    if (!titleResult.valid) nextErrors.title = titleResult.message;
    // El documento y la imagen solo se validan si se van a reemplazar.
    if (document) {
      const r = validateDocument(document);
      if (!r.valid) nextErrors.document = r.message;
    }
    if (image) {
      const r = validateImage(image);
      if (!r.valid) nextErrors.image = r.message;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const patch: Parameters<typeof updateArticle>[1] = {
        title: title.trim(),
        isPublic,
      };

      if (document) {
        patch.documentPath = await storageService.uploadDocument(
          user.id,
          document,
        );
        // Resumen: TXT en el cliente; PDF/DOCX → placeholder (lo deriva el
        // servidor al reindexar).
        patch.summary =
          getFileExtension(document.name) === "txt"
            ? deriveSummary(await document.text())
            : DOCUMENT_SUMMARY_PLACEHOLDER;
      }
      if (image) {
        patch.imagePath = await storageService.uploadCover(user.id, image);
      }

      await updateArticle(article.id, patch);
      // Reindexa (título/visibilidad/documento pueden haber cambiado).
      void requestArticleIndex(article.id);
      toast.success("Artículo actualizado.");
      router.replace(`/article/${article.id}`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo actualizar el artículo.",
      );
    } finally {
      setSaving(false);
    }
  }

  const documentAccept = ALLOWED_DOCUMENT_EXTENSIONS.map((e) => `.${e}`).join(",");
  const imageAccept = ALLOWED_IMAGE_MIME_TYPES.join(",");

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title ? (
          <p className="text-xs text-destructive">{errors.title}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="document">
          Reemplazar documento (opcional, TXT/DOCX/PDF)
        </Label>
        <Input
          id="document"
          type="file"
          accept={documentAccept}
          onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
          aria-invalid={Boolean(errors.document)}
        />
        <p className="text-xs text-muted-foreground">
          {document
            ? `Nuevo: ${document.name}`
            : "Deja vacío para conservar el documento actual."}
        </p>
        {errors.document ? (
          <p className="text-xs text-destructive">{errors.document}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="image">Reemplazar imagen de portada (opcional)</Label>
        <Input
          id="image"
          type="file"
          accept={imageAccept}
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          aria-invalid={Boolean(errors.image)}
        />
        <p className="text-xs text-muted-foreground">
          {image
            ? `Nueva: ${image.name}`
            : "Deja vacío para conservar la imagen actual."}
        </p>
        {errors.image ? (
          <p className="text-xs text-destructive">{errors.image}</p>
        ) : null}
      </div>

      <VisibilityField value={isPublic} onChange={setIsPublic} disabled={saving} />

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar cambios
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={saving}
          onClick={() => router.push(`/article/${article.id}`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

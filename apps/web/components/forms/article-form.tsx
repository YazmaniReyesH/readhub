"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCreateArticle } from "@/hooks/useArticles";
import { useUpload } from "@/hooks/useUpload";
import { requestArticleIndex } from "@/services/article.service";
import { VisibilityField } from "@/components/forms/visibility-field";
import {
  validateDocument,
  validateImage,
  validateTitle,
} from "@/lib/validators/article";
import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
} from "@readhub/config";

type Errors = { title?: string; document?: string; image?: string };

export function ArticleForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { uploadArticleFiles, uploading } = useUpload();
  const { createArticle, submitting } = useCreateArticle();

  const [title, setTitle] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [errors, setErrors] = useState<Errors>({});

  const busy = uploading || submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Validaciones (BR-007, BR-008, BR-009).
    const titleResult = validateTitle(title);
    const docResult = validateDocument(document);
    const imgResult = validateImage(image);
    const nextErrors: Errors = {};
    if (!titleResult.valid) nextErrors.title = titleResult.message;
    if (!docResult.valid) nextErrors.document = docResult.message;
    if (!imgResult.valid) nextErrors.image = imgResult.message;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!user) {
      toast.error("Debes iniciar sesión para publicar.");
      return;
    }

    try {
      const { documentPath, imagePath, summary } = await uploadArticleFiles(
        user.id,
        document!,
        image!,
      );
      const id = await createArticle({
        authorId: user.id,
        title: title.trim(),
        summary,
        documentPath,
        imagePath,
        isPublic,
      });
      // Indexación automática para el sistema RAG (no bloquea la publicación).
      void requestArticleIndex(id);
      toast.success("Artículo publicado correctamente.");
      router.replace("/");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo publicar el artículo.",
      );
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
          placeholder="Un título atractivo para tu artículo"
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title ? (
          <p className="text-xs text-destructive">{errors.title}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="document">Documento (TXT, DOCX o PDF)</Label>
        <Input
          id="document"
          type="file"
          accept={documentAccept}
          onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
          aria-invalid={Boolean(errors.document)}
        />
        {document ? (
          <p className="text-xs text-muted-foreground">
            Seleccionado: {document.name}
          </p>
        ) : null}
        {errors.document ? (
          <p className="text-xs text-destructive">{errors.document}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="image">Imagen de portada</Label>
        <Input
          id="image"
          type="file"
          accept={imageAccept}
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          aria-invalid={Boolean(errors.image)}
        />
        {image ? (
          <p className="text-xs text-muted-foreground">
            Seleccionada: {image.name}
          </p>
        ) : null}
        {errors.image ? (
          <p className="text-xs text-destructive">{errors.image}</p>
        ) : null}
      </div>

      <VisibilityField value={isPublic} onChange={setIsPublic} disabled={busy} />

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading
            ? "Subiendo archivos…"
            : submitting
              ? "Publicando…"
              : "Publicar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={() => router.push("/")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

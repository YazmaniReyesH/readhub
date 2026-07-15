import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/constants";

/** Resultado de una validación: válido, o inválido con mensaje. */
export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

/** Devuelve la extensión (minúsculas, sin punto) de un nombre de archivo. */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/** BR-007: el título no puede estar vacío. */
export function validateTitle(title: string): ValidationResult {
  if (!title.trim()) {
    return { valid: false, message: "El título no puede estar vacío." };
  }
  if (title.trim().length > 200) {
    return { valid: false, message: "El título es demasiado largo (máx. 200)." };
  }
  return { valid: true };
}

/** BR-008 / BR-023: documento TXT, DOCX o PDF válido y dentro del tamaño. */
export function validateDocument(file: File | null): ValidationResult {
  if (!file) {
    return { valid: false, message: "Debes seleccionar un documento." };
  }
  const extension = getFileExtension(file.name);
  const validExtension = (
    ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]
  ).includes(extension);
  const validMime = (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(
    file.type,
  );
  // Se acepta si coincide el MIME o, como respaldo, la extensión (algunos
  // navegadores no reportan el MIME de DOCX de forma fiable).
  if (!validMime && !validExtension) {
    return {
      valid: false,
      message: "El documento debe tener formato TXT, DOCX o PDF.",
    };
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      valid: false,
      message: "El documento supera el tamaño máximo permitido (10 MB).",
    };
  }
  return { valid: true };
}

/** BR-009 / BR-023: imagen de portada válida y dentro del tamaño. */
export function validateImage(file: File | null): ValidationResult {
  if (!file) {
    return { valid: false, message: "Debes seleccionar una imagen de portada." };
  }
  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      message: "La imagen debe ser JPG, PNG o WEBP.",
    };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      message: "La imagen supera el tamaño máximo permitido (5 MB).",
    };
  }
  return { valid: true };
}

/** BR-017: no se permiten comentarios vacíos. */
export function validateComment(comment: string): ValidationResult {
  if (!comment.trim()) {
    return { valid: false, message: "El comentario no puede estar vacío." };
  }
  if (comment.trim().length > 2000) {
    return { valid: false, message: "El comentario es demasiado largo." };
  }
  return { valid: true };
}

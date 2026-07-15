import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getFileExtension } from "@/lib/validators/article";

/**
 * Capa de acceso a Supabase Storage.
 * Convención de rutas: `<user_id>/<uuid>.<ext>` (la RLS exige que la primera
 * carpeta sea el id del propietario).
 */

function buildObjectPath(userId: string, file: File): string {
  const ext = getFileExtension(file.name) || "bin";
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}

/** Sube el documento del artículo al bucket privado. Devuelve la ruta. */
export async function uploadDocument(
  userId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const path = buildObjectPath(userId, file);
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.documents)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(`No se pudo subir el documento: ${error.message}`);
  return path;
}

/** Sube la imagen de portada al bucket público. Devuelve la ruta. */
export async function uploadCover(userId: string, file: File): Promise<string> {
  const supabase = createClient();
  const path = buildObjectPath(userId, file);
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.covers)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return path;
}

/** URL pública de una imagen de portada (bucket público). */
export function getCoverPublicUrl(path: string | null): string | null {
  if (!path) return null;
  const supabase = createClient();
  const { data } = supabase.storage
    .from(STORAGE_BUCKETS.covers)
    .getPublicUrl(path);
  return data.publicUrl;
}

/** URL firmada temporal para descargar/leer un documento (bucket privado). */
export async function getDocumentSignedUrl(
  path: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.documents)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/** Descarga un documento y devuelve su contenido como texto (para TXT). */
export async function fetchDocumentText(path: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.documents)
    .download(path);
  if (error) throw new Error(error.message);
  return await data.text();
}

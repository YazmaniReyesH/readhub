/**
 * Constantes globales de la aplicación ReadHub.
 *
 * Centraliza valores compartidos por el frontend y el backend para evitar
 * "magic strings" repartidos por el código.
 */

import type { UserRole } from "@/types/database";

/* -------------------------------------------------------------------------- */
/*  Metadatos de la aplicación                                                */
/* -------------------------------------------------------------------------- */

export const APP_NAME = "ReadHub";
export const APP_DESCRIPTION =
  "Plataforma de lectura y escritura donde los usuarios publican y consumen artículos.";

/* -------------------------------------------------------------------------- */
/*  Roles de usuario                                                          */
/* -------------------------------------------------------------------------- */

export const USER_ROLES: readonly UserRole[] = ["reader", "writer", "admin"];
export const DEFAULT_USER_ROLE: UserRole = "reader";

/* -------------------------------------------------------------------------- */
/*  Almacenamiento (Supabase Storage)                                         */
/* -------------------------------------------------------------------------- */

export const STORAGE_BUCKETS = {
  /** Documentos de los artículos (TXT, DOCX, PDF). Bucket privado. */
  documents: "article-documents",
  /** Imágenes de portada de los artículos. Bucket público. */
  covers: "article-covers",
} as const;

/* -------------------------------------------------------------------------- */
/*  Carga de archivos (reglas de negocio BR-007, BR-008, BR-009, BR-023)      */
/* -------------------------------------------------------------------------- */

/** Tipos MIME de documento permitidos. */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/** Extensiones de documento permitidas. */
export const ALLOWED_DOCUMENT_EXTENSIONS = ["txt", "pdf", "docx"] as const;

/** Tipos MIME de imagen permitidos para la portada. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Tamaño máximo de documento: 10 MB. */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

/** Tamaño máximo de imagen de portada: 5 MB. */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/* -------------------------------------------------------------------------- */
/*  Variables de entorno                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Indica si las claves públicas de Supabase están configuradas.
 * Útil para que el middleware no falle antes de completar `.env.local`.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Devuelve la URL pública del proyecto de Supabase.
 * Lanza un error explícito si la variable no está configurada.
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL. Copia .env.example a .env.local y complétala.",
    );
  }
  return url;
}

/**
 * Devuelve la clave pública (anon) del proyecto de Supabase.
 * Lanza un error explícito si la variable no está configurada.
 */
export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env.local y complétala.",
    );
  }
  return key;
}

/** Devuelve la clave service_role (solo servidor). */
export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY.");
  }
  return key;
}

/* -------------------------------------------------------------------------- */
/*  IA / RAG (Etapa 4) — solo servidor                                        */
/* -------------------------------------------------------------------------- */

/** Modelo de embeddings de Voyage AI y su dimensión (debe coincidir con la BD). */
export const VOYAGE_EMBEDDING_MODEL =
  process.env.VOYAGE_EMBEDDING_MODEL || "voyage-3.5";
export const EMBEDDING_DIMENSIONS = 1024;

/** Modelo de Claude para el asistente conversacional. */
export const ANTHROPIC_CHAT_MODEL =
  process.env.ANTHROPIC_CHAT_MODEL || "claude-opus-4-8";

/** Parámetros del pipeline RAG. */
export const RAG_TOP_K = 5; // nº máximo de documentos recuperados
export const RAG_SIMILARITY_THRESHOLD = 0.2; // umbral mínimo de similitud (coseno)
export const RAG_MAX_CONTEXT_CHARS = 8000; // límite del contexto enviado a Claude
export const RAG_MAX_DOC_CHARS = 2500; // límite por documento dentro del contexto

export function getVoyageKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("Falta la variable de entorno VOYAGE_API_KEY.");
  return key;
}

export function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Falta la variable de entorno ANTHROPIC_API_KEY.");
  return key;
}

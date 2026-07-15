"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import * as articleService from "@/services/article.service";
import type { CreateArticleInput } from "@/services/article.service";
import * as storageService from "@/services/storage.service";
import { getFileExtension } from "@/lib/validators/article";
import type { ArticleWithStats } from "@/types/database";

/** Listado de artículos para la página principal. */
export function useArticlesFeed() {
  const [articles, setArticles] = useState<ArticleWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setArticles(await articleService.getArticlesFeed());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar artículos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { articles, loading, error, refresh };
}

/**
 * Detalle de un artículo. Si se indica `viewerId`, registra automáticamente una
 * visualización (una sola vez por montaje) antes de cargar los datos (BR-011).
 */
export function useArticle(id: string, viewerId: string | null) {
  const [article, setArticle] = useState<ArticleWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewRegistered = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setArticle(await articleService.getArticleById(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el artículo.");
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      // Registrar la visualización una única vez por apertura.
      if (viewerId && !viewRegistered.current) {
        viewRegistered.current = true;
        try {
          await articleService.registerView(id, viewerId);
        } catch {
          // Una vista fallida no debe impedir mostrar el artículo.
        }
      }
      if (!active) return;
      await load();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, viewerId, load]);

  return { article, loading, error, refresh: load };
}

export type DocumentKind = "txt" | "pdf" | "docx" | "other";

/**
 * Carga el documento de un artículo para mostrarlo: texto para TXT, URL firmada
 * para PDF (embebible) y DOCX (descarga).
 */
export function useArticleDocument(documentPath: string | null) {
  const [kind, setKind] = useState<DocumentKind>("other");
  const [text, setText] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      setText(null);
      setUrl(null);
      if (!documentPath) {
        setLoading(false);
        return;
      }
      const ext = getFileExtension(documentPath);
      const nextKind: DocumentKind =
        ext === "txt" || ext === "pdf" || ext === "docx" ? ext : "other";
      if (active) setKind(nextKind);
      try {
        if (nextKind === "txt") {
          const content = await storageService.fetchDocumentText(documentPath);
          if (active) setText(content);
        } else {
          const signed = await storageService.getDocumentSignedUrl(documentPath);
          if (active) setUrl(signed);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el documento.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [documentPath]);

  return { kind, text, url, loading, error };
}

/** Acción de creación de artículos (usada por el formulario de publicación). */
export function useCreateArticle() {
  const [submitting, setSubmitting] = useState(false);

  const createArticle = useCallback(async (input: CreateArticleInput) => {
    setSubmitting(true);
    try {
      return await articleService.createArticle(input);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { createArticle, submitting };
}

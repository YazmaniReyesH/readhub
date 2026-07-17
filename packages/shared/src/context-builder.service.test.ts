import { describe, it, expect } from "vitest";

import { buildContext } from "./context-builder.service";
import type { RetrievedArticle } from "@readhub/types";

function doc(overrides: Partial<RetrievedArticle> = {}): RetrievedArticle {
  return {
    article_id: "id-1",
    title: "Título de prueba",
    summary: "Resumen",
    content: "Contenido del artículo de prueba.",
    author_name: "Autor",
    similarity: 0.9,
    ...overrides,
  };
}

describe("buildContext", () => {
  it("sin documentos → hasContext false y sin fuentes", () => {
    const r = buildContext([]);
    expect(r.hasContext).toBe(false);
    expect(r.sources).toEqual([]);
  });

  it("ignora documentos con contenido vacío", () => {
    const r = buildContext([doc({ content: "   " })]);
    expect(r.hasContext).toBe(false);
  });

  it("construye el prompt e incluye el título y el contenido", () => {
    const r = buildContext([doc({ title: "RLS en Supabase", content: "Texto sobre RLS." })]);
    expect(r.hasContext).toBe(true);
    expect(r.systemPrompt).toContain("RLS en Supabase");
    expect(r.systemPrompt).toContain("Texto sobre RLS.");
  });

  it("mapea las fuentes con id, título, autor y similitud", () => {
    const r = buildContext([
      doc({ article_id: "a1", title: "Uno", author_name: "Alice", similarity: 0.8 }),
    ]);
    expect(r.sources).toEqual([
      { articleId: "a1", title: "Uno", authorName: "Alice", similarity: 0.8 },
    ]);
  });

  it("preserva el orden por relevancia recibido", () => {
    const r = buildContext([
      doc({ article_id: "a1", title: "Primero", similarity: 0.9 }),
      doc({ article_id: "a2", title: "Segundo", similarity: 0.5 }),
    ]);
    expect(r.sources.map((s) => s.articleId)).toEqual(["a1", "a2"]);
  });
});

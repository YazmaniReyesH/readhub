import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de las dependencias externas: proveedor de embeddings y cliente admin.
const rpcMock = vi.fn();

vi.mock("@readhub/ai", () => ({
  embedText: vi.fn().mockResolvedValue(new Array(1024).fill(0.1)),
}));

vi.mock("@readhub/database", () => ({
  createAdminClient: () => ({ rpc: rpcMock }),
}));

import { searchArticles } from "./vector-search.service";
import { embedText } from "@readhub/ai";

describe("searchArticles", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    (embedText as ReturnType<typeof vi.fn>).mockClear();
  });

  it("embebe la consulta como 'query' y llama a match_articles", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await searchArticles("¿qué es RLS?");

    expect(embedText).toHaveBeenCalledWith("¿qué es RLS?", "query");
    expect(rpcMock).toHaveBeenCalledWith(
      "match_articles",
      expect.objectContaining({
        match_count: expect.any(Number),
        similarity_threshold: expect.any(Number),
      }),
    );
  });

  it("respeta topK y umbral personalizados", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await searchArticles("hola", { topK: 3, similarityThreshold: 0.5 });
    expect(rpcMock).toHaveBeenCalledWith(
      "match_articles",
      expect.objectContaining({ match_count: 3, similarity_threshold: 0.5 }),
    );
  });

  it("devuelve los documentos recuperados", async () => {
    const rows = [
      {
        article_id: "a1",
        title: "RLS",
        summary: null,
        content: "…",
        author_name: "Alice",
        similarity: 0.7,
      },
    ];
    rpcMock.mockResolvedValue({ data: rows, error: null });
    const result = await searchArticles("rls");
    expect(result).toEqual(rows);
  });

  it("lanza si la RPC devuelve error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(searchArticles("x")).rejects.toThrow("boom");
  });
});

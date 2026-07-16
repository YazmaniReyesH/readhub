import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getArticleById,
  listArticles,
  searchArticlesByText,
} from "@readhub/database";
import { answerQuestion, searchArticles } from "@readhub/shared";
import { completeText } from "@readhub/ai";

/** Helper: respuesta de texto para una Tool MCP. */
function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}

/**
 * Registra todas las Tools del servidor MCP. Reutiliza la lógica de los
 * paquetes compartidos (@readhub/database, @readhub/shared, @readhub/ai)
 * sin duplicar consultas ni el pipeline RAG.
 */
export function registerTools(server: McpServer): void {
  /* ------------------------------ Tools básicas --------------------------- */

  server.registerTool(
    "buscar_articulos",
    {
      title: "Buscar artículos",
      description:
        "Busca artículos públicos por palabra clave en el título y el resumen.",
      inputSchema: {
        query: z.string().describe("Términos de búsqueda"),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    async ({ query, limit }) => {
      const rows = await searchArticlesByText(query, limit ?? 10);
      if (rows.length === 0) return text("No se encontraron artículos.");
      return text(
        rows
          .map(
            (r) =>
              `• ${r.title}\n  id: ${r.id} · autor: ${r.author_name ?? "?"}\n  ${r.summary ?? ""}`,
          )
          .join("\n\n"),
      );
    },
  );

  server.registerTool(
    "listar_articulos",
    {
      title: "Listar artículos",
      description: "Lista los artículos públicos más recientes con sus estadísticas.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ limit }) => {
      const rows = await listArticles(limit ?? 20);
      if (rows.length === 0) return text("Aún no hay artículos publicados.");
      return text(
        rows
          .map(
            (a) =>
              `• ${a.title}\n  id: ${a.id} · autor: ${a.author_name ?? "?"} · vistas: ${a.views_count} · likes: ${a.likes_count} · comentarios: ${a.comments_count}`,
          )
          .join("\n\n"),
      );
    },
  );

  server.registerTool(
    "obtener_articulo",
    {
      title: "Obtener artículo",
      description: "Obtiene el detalle de un artículo público por su id.",
      inputSchema: { id: z.string().describe("id (UUID) del artículo") },
    },
    async ({ id }) => {
      const a = await getArticleById(id);
      if (!a) return text("Artículo no encontrado o no es público.");
      return text(
        `# ${a.title}\n\nAutor: ${a.author_name ?? "?"}\nPublicado: ${a.created_at}\nVistas: ${a.views_count} · Likes: ${a.likes_count} · Comentarios: ${a.comments_count}\n\nResumen:\n${a.summary ?? "(sin resumen)"}`,
      );
    },
  );

  server.registerTool(
    "buscar_semantica",
    {
      title: "Búsqueda semántica",
      description:
        "Recupera los artículos más relevantes para una consulta usando similitud vectorial (embeddings).",
      inputSchema: {
        query: z.string().describe("Consulta en lenguaje natural"),
        top_k: z.number().int().min(1).max(10).optional(),
      },
    },
    async ({ query, top_k }) => {
      const docs = await searchArticles(query, { topK: top_k ?? 5 });
      if (docs.length === 0) return text("No se encontraron artículos relevantes.");
      return text(
        docs
          .map(
            (d) =>
              `• ${d.title} (relevancia ${Math.round(d.similarity * 100)}%)\n  id: ${d.article_id} · autor: ${d.author_name ?? "?"}\n  ${d.content.slice(0, 300)}…`,
          )
          .join("\n\n"),
      );
    },
  );

  server.registerTool(
    "responder_pregunta",
    {
      title: "Responder con RAG",
      description:
        "Responde una pregunta usando el pipeline RAG de ReadHub (recuperación + Claude). Cita las fuentes utilizadas.",
      inputSchema: { query: z.string().describe("Pregunta en lenguaje natural") },
    },
    async ({ query }) => {
      const result = await answerQuestion(query);
      const sources = result.sources.length
        ? "\n\nFuentes:\n" +
          result.sources
            .map((s) => `- ${s.title} (id: ${s.articleId})`)
            .join("\n")
        : "";
      return text(result.answer + sources);
    },
  );

  /* ----------------------------- Tools avanzadas -------------------------- */

  server.registerTool(
    "comparar_articulos",
    {
      title: "Comparar artículos",
      description:
        "Compara dos o más artículos e identifica similitudes, diferencias y posibles contradicciones.",
      inputSchema: {
        ids: z.array(z.string()).min(2).describe("Lista de ids de artículos a comparar"),
      },
    },
    async ({ ids }) => {
      const articles = await Promise.all(ids.map((id) => getArticleById(id)));
      const found = articles.filter((a) => a !== null);
      if (found.length < 2) {
        return text("Se necesitan al menos 2 artículos públicos válidos para comparar.");
      }
      const context = found
        .map((a) => `Título: "${a!.title}"\nResumen: ${a!.summary ?? "(sin resumen)"}`)
        .join("\n\n---\n\n");
      const answer = await completeText({
        system:
          "Eres un analista. Compara los siguientes artículos de ReadHub. Indica similitudes, diferencias y posibles contradicciones. Usa solo la información dada.",
        messages: [{ role: "user", content: context }],
        maxTokens: 1024,
      });
      return text(answer);
    },
  );

  server.registerTool(
    "extraer_temas_clave",
    {
      title: "Extraer temas clave",
      description:
        "Identifica los temas y conceptos principales relacionados con una consulta, a partir de los artículos de ReadHub.",
      inputSchema: {
        query: z.string().describe("Tema o consulta a analizar"),
        top_k: z.number().int().min(1).max(10).optional(),
      },
    },
    async ({ query, top_k }) => {
      const docs = await searchArticles(query, { topK: top_k ?? 5 });
      if (docs.length === 0) return text("No se encontraron artículos relevantes.");
      const context = docs
        .map((d) => `"${d.title}":\n${d.content.slice(0, 800)}`)
        .join("\n\n");
      const answer = await completeText({
        system:
          "Extrae los temas y conceptos clave del siguiente contenido de ReadHub. Devuelve una lista concisa con una breve explicación de cada uno. Usa solo la información dada.",
        messages: [{ role: "user", content: context }],
        maxTokens: 800,
      });
      return text(answer);
    },
  );

  server.registerTool(
    "construir_contexto_investigacion",
    {
      title: "Construir contexto de investigación",
      description:
        "Recupera y organiza el contexto relevante de ReadHub para una investigación, devolviendo el material y las fuentes (sin generar respuesta).",
      inputSchema: {
        query: z.string().describe("Tema de investigación"),
        top_k: z.number().int().min(1).max(10).optional(),
      },
    },
    async ({ query, top_k }) => {
      const docs = await searchArticles(query, { topK: top_k ?? 6 });
      if (docs.length === 0) return text("No se encontró material relevante.");
      const bundle = docs
        .map(
          (d, i) =>
            `[Fuente ${i + 1}] "${d.title}" — ${d.author_name ?? "?"} (id: ${d.article_id}, relevancia ${Math.round(d.similarity * 100)}%)\n${d.content.slice(0, 1200)}`,
        )
        .join("\n\n---\n\n");
      return text(bundle);
    },
  );
}

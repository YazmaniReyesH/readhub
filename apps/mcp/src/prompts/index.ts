import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getArticleById } from "@readhub/database";

/** Helper: mensaje de usuario para un Prompt MCP. */
function userMessage(textContent: string) {
  return {
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text: textContent },
      },
    ],
  };
}

async function articleContext(id: string): Promise<string> {
  const a = await getArticleById(id);
  if (!a) return `No se encontró el artículo con id ${id}.`;
  return `Título: "${a.title}"\nAutor: ${a.author_name ?? "?"}\nResumen: ${a.summary ?? "(sin resumen)"}`;
}

/**
 * Registra los Prompts reutilizables del servidor MCP: instrucciones
 * predefinidas para interactuar con el conocimiento de ReadHub.
 */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "resumir_articulo",
    {
      title: "Resumir artículo",
      description: "Genera un resumen claro y conciso de un artículo de ReadHub.",
      argsSchema: { article_id: z.string().describe("id del artículo") },
    },
    async ({ article_id }) => {
      const ctx = await articleContext(article_id);
      return userMessage(
        `Resume el siguiente artículo de ReadHub en 3-5 frases, destacando sus ideas principales.\n\n${ctx}`,
      );
    },
  );

  server.registerPrompt(
    "explicar_articulo",
    {
      title: "Explicar artículo",
      description: "Explica un artículo de forma sencilla, adaptando el nivel.",
      argsSchema: {
        article_id: z.string().describe("id del artículo"),
        nivel: z
          .string()
          .optional()
          .describe("Nivel de detalle: 'principiante', 'intermedio' o 'experto'"),
      },
    },
    async ({ article_id, nivel }) => {
      const ctx = await articleContext(article_id);
      return userMessage(
        `Explica el siguiente artículo de ReadHub para un público de nivel ${nivel ?? "intermedio"}. Usa un lenguaje claro y ejemplos si ayudan.\n\n${ctx}`,
      );
    },
  );

  server.registerPrompt(
    "comparar_articulos",
    {
      title: "Comparar artículos",
      description: "Compara varios artículos e identifica similitudes y diferencias.",
      argsSchema: {
        ids: z.string().describe("ids de artículos separados por comas"),
      },
    },
    async ({ ids }) => {
      const list = ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const contexts = await Promise.all(list.map((id) => articleContext(id)));
      return userMessage(
        `Compara los siguientes artículos de ReadHub. Indica similitudes, diferencias y posibles contradicciones.\n\n${contexts.join("\n\n---\n\n")}`,
      );
    },
  );

  server.registerPrompt(
    "generar_preguntas",
    {
      title: "Generar preguntas",
      description: "Genera preguntas de comprensión sobre un artículo.",
      argsSchema: { article_id: z.string().describe("id del artículo") },
    },
    async ({ article_id }) => {
      const ctx = await articleContext(article_id);
      return userMessage(
        `Genera 5 preguntas de comprensión (con distinto nivel de dificultad) sobre el siguiente artículo de ReadHub.\n\n${ctx}`,
      );
    },
  );

  server.registerPrompt(
    "extraer_conceptos_clave",
    {
      title: "Extraer conceptos clave",
      description: "Extrae los conceptos y palabras clave de un artículo.",
      argsSchema: { article_id: z.string().describe("id del artículo") },
    },
    async ({ article_id }) => {
      const ctx = await articleContext(article_id);
      return userMessage(
        `Extrae los conceptos y palabras clave más importantes del siguiente artículo de ReadHub. Devuélvelos como una lista con una breve definición de cada uno.\n\n${ctx}`,
      );
    },
  );
}

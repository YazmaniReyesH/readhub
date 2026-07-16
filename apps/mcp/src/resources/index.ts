import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getArticleById,
  getPlatformStats,
  listArticles,
  listAuthors,
} from "@readhub/database";
import { APP_DESCRIPTION, APP_NAME } from "@readhub/config";

/**
 * Registra los Resources del servidor MCP: información estructurada de ReadHub
 * que un cliente puede navegar y leer. Reutiliza los servicios compartidos.
 */
export function registerResources(server: McpServer): void {
  // Información general de la plataforma.
  server.registerResource(
    "info",
    "readhub://info",
    {
      title: "Información de ReadHub",
      description: "Descripción general de la plataforma y sus estadísticas.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const stats = await getPlatformStats();
      const textContent = `# ${APP_NAME}\n\n${APP_DESCRIPTION}\n\n## Estadísticas\n- Artículos: ${stats.articles}\n- Autores/usuarios: ${stats.authors}\n- Visualizaciones: ${stats.views}\n- Me gusta: ${stats.likes}\n- Comentarios: ${stats.comments}`;
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: textContent }],
      };
    },
  );

  // Listado de artículos públicos.
  server.registerResource(
    "articles",
    "readhub://articles",
    {
      title: "Artículos",
      description: "Listado de artículos públicos con sus estadísticas.",
      mimeType: "application/json",
    },
    async (uri) => {
      const articles = await listArticles(50);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(articles, null, 2),
          },
        ],
      };
    },
  );

  // Detalle de un artículo por id (recurso con plantilla).
  server.registerResource(
    "article",
    new ResourceTemplate("readhub://article/{id}", { list: undefined }),
    {
      title: "Artículo",
      description: "Detalle de un artículo público por id.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const id = String(variables.id);
      const article = await getArticleById(id);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(article ?? { error: "No encontrado" }, null, 2),
          },
        ],
      };
    },
  );

  // Autores.
  server.registerResource(
    "authors",
    "readhub://authors",
    {
      title: "Autores",
      description: "Autores de ReadHub y su número de artículos públicos.",
      mimeType: "application/json",
    },
    async (uri) => {
      const authors = await listAuthors();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(authors, null, 2),
          },
        ],
      };
    },
  );

  // Categorías (aún no implementadas en el modelo de datos).
  server.registerResource(
    "categories",
    "readhub://categories",
    {
      title: "Categorías",
      description: "Categorías de artículos (preparado para futuras versiones).",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              categories: [],
              note: "El modelo aún no incluye categorías; está previsto para fases posteriores.",
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  // Estadísticas globales.
  server.registerResource(
    "stats",
    "readhub://stats",
    {
      title: "Estadísticas",
      description: "Estadísticas globales de la plataforma.",
      mimeType: "application/json",
    },
    async (uri) => {
      const stats = await getPlatformStats();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    },
  );
}

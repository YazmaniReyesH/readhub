import {
  EMBEDDING_DIMENSIONS,
  VOYAGE_EMBEDDING_MODEL,
  getVoyageKey,
} from "@/lib/constants";
import type { Embedding } from "@/types/embedding";

const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";

/** Tipo de entrada para la recuperación asimétrica de Voyage. */
export type EmbeddingInputType = "document" | "query";

/**
 * Genera el embedding de un texto usando Voyage AI. Centraliza la comunicación
 * con el proveedor: ningún otro módulo debe hablar con Voyage directamente.
 *
 * `inputType` mejora la recuperación: "document" al indexar artículos y "query"
 * al buscar, siguiendo el esquema de embeddings asimétricos de Voyage.
 */
export async function embedText(
  text: string,
  inputType: EmbeddingInputType = "document",
): Promise<Embedding> {
  const input = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!input) throw new Error("No se puede generar un embedding de texto vacío.");

  const response = await fetch(VOYAGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getVoyageKey()}`,
    },
    body: JSON.stringify({
      input: [input],
      model: VOYAGE_EMBEDDING_MODEL,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Voyage AI ${response.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await response.json()) as {
    data?: { embedding?: number[] }[];
  };
  const embedding = json.data?.[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding inválido: se esperaban ${EMBEDDING_DIMENSIONS} dimensiones${
        embedding ? `, se recibieron ${embedding.length}` : ""
      }.`,
    );
  }
  return embedding;
}

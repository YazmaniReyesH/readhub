import { APP_NAME } from "@readhub/config";

/** Mensaje cuando no hay contexto suficiente para responder. */
export const NO_CONTEXT_MESSAGE =
  "No encontré información en los artículos de ReadHub para responder esa pregunta. " +
  "Intenta reformularla o consulta otro tema.";

/**
 * Construye el prompt de sistema del asistente RAG.
 * Refuerza que Claude debe responder ÚNICAMENTE con el contexto recuperado y
 * citar las fuentes, evitando alucinaciones.
 */
export function buildRagSystemPrompt(context: string): string {
  return `Eres el asistente inteligente de ${APP_NAME}, una plataforma de artículos.

Tu tarea es responder la pregunta del usuario utilizando EXCLUSIVAMENTE la información contenida en los siguientes artículos recuperados de la plataforma. No uses conocimiento externo ni inventes datos.

Reglas:
- Responde solo con información presente en el contexto. Si el contexto no contiene la respuesta, indícalo claramente y no especules.
- Sé claro, conciso y directo. Responde en el idioma de la pregunta (por defecto, español).
- Cuando cites información, menciona el título del artículo del que proviene.
- No incluyas razonamiento interno; entrega directamente la respuesta final.

=== CONTEXTO (artículos de ${APP_NAME}) ===
${context}
=== FIN DEL CONTEXTO ===`;
}

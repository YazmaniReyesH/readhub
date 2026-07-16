# Ejemplos de uso

## Ejemplo 1 — Planificar un artículo

**Usuario:** "Quiero escribir sobre seguridad en bases de datos con Supabase."

**Asistente:**
1. Ejecuta `buscar_semantica("seguridad en bases de datos Supabase")`.
2. Encuentra "Row Level Security en Supabase". Avisa del solapamiento y propone
   un ángulo nuevo (p. ej. "RLS avanzado: políticas por rol y multitenancy").
3. Entrega objetivo + público + esquema inicial.

## Ejemplo 2 — Mejorar y titular

**Usuario:** "Revisa la claridad de este borrador y proponme un título."

**Asistente:** Señala frases confusas y redundancias, reescribe los pasajes
problemáticos (respetando la voz), y ofrece 3 títulos + un resumen para la tarjeta.

## Ejemplo 3 — ¿Está listo para publicar?

**Usuario:** "¿Está listo para publicar?"

**Asistente:**
1. Aplica el checklist de prepublicación.
2. Ejecuta `comparar_articulos` con los ids de los 2 artículos más parecidos
   (obtenidos con `buscar_semantica`).
3. Reporta fortalezas, debilidades y recomendaciones priorizadas; indica si hay
   contradicciones con lo ya publicado y cita las fuentes (título + id).

## Ejemplo 4 — Investigación documental

**Usuario:** "¿Qué dice ReadHub sobre TypeScript en equipos?"

**Asistente:** Usa `responder_pregunta("...")` (RAG) y presenta la respuesta con
las fuentes citadas, o `construir_contexto_investigacion` si necesita el material
para redactar.

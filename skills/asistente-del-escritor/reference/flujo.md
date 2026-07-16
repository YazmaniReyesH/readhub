# Flujo de trabajo detallado — Asistente del Escritor

## 1. Planificación

- Aclara **tema**, **audiencia** y **tipo** (académico, científico o técnico).
- Llama a `buscar_semantica` con el tema para ver qué existe ya en ReadHub.
- Si hay solapamiento fuerte, propón un ángulo diferenciador.
- Entrega: objetivo del artículo en 1-2 frases + público objetivo.

## 2. Organización de ideas y esquema

- Propón un esquema con secciones (introducción, desarrollo, conclusión, etc.).
- Ordena las ideas del usuario en ese esquema.
- Sugiere qué evidencia o referencias de ReadHub reforzarían cada sección
  (usa `construir_contexto_investigacion`).

## 3. Redacción y mejora

- Mejora **claridad** (frases directas), **coherencia** (hilo lógico) y elimina
  **redundancias**.
- Ofrece 3 opciones de **título** y un **resumen** (1 párrafo) para la tarjeta.
- Extrae **palabras clave** (usa el Prompt `extraer_conceptos_clave` si aplica).
- Respeta la voz del autor; no reescribas de más sin permiso.

## 4. Contraste con el conocimiento existente

- Usa `comparar_articulos` con los ids de los artículos más parecidos.
- Señala **similitudes**, **diferencias** y **posibles contradicciones**.
- Si el artículo contradice algo publicado, avisa y sugiere cómo reconciliarlo o
  justificar la discrepancia.

## 5. Prepublicación

- Aplica el checklist de [checklist.md](checklist.md).
- Da recomendaciones finales concretas y priorizadas.
- Cierra citando las fuentes de ReadHub usadas (título + id).

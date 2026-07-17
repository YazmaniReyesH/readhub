import { describe, it, expect } from "vitest";

import { deriveSummary, DOCUMENT_SUMMARY_PLACEHOLDER } from "./index";

describe("deriveSummary", () => {
  it("toma el primer párrafo no vacío", () => {
    const text = "Primer párrafo.\n\nSegundo párrafo.";
    expect(deriveSummary(text)).toBe("Primer párrafo.");
  });

  it("ignora líneas en blanco iniciales", () => {
    const text = "\n\n   \n\nContenido real aquí.";
    expect(deriveSummary(text)).toBe("Contenido real aquí.");
  });

  it("colapsa espacios en blanco", () => {
    expect(deriveSummary("hola    mundo\ttest")).toBe("hola mundo test");
  });

  it("recorta al máximo indicado", () => {
    const long = "a".repeat(500);
    expect(deriveSummary(long, 100)).toHaveLength(100);
  });

  it("respeta el máximo por defecto de 300", () => {
    const long = "b".repeat(1000);
    expect(deriveSummary(long).length).toBeLessThanOrEqual(300);
  });

  it("devuelve cadena vacía para texto vacío", () => {
    expect(deriveSummary("")).toBe("");
    expect(deriveSummary("   \n  ")).toBe("");
  });

  it("el placeholder está definido y no vacío", () => {
    expect(DOCUMENT_SUMMARY_PLACEHOLDER.length).toBeGreaterThan(0);
  });
});

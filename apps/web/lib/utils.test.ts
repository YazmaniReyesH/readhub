import { describe, it, expect } from "vitest";

import { cn, formatDate, formatNumber } from "./utils";

describe("cn", () => {
  it("combina clases y resuelve conflictos de Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe(
      "text-sm font-bold",
    );
  });
});

describe("formatDate", () => {
  it("formatea una fecha ISO incluyendo el año", () => {
    expect(formatDate("2026-07-16")).toContain("2026");
  });
  it("devuelve la entrada si no es una fecha válida", () => {
    expect(formatDate("no-es-fecha")).toBe("no-es-fecha");
  });
});

describe("formatNumber", () => {
  it("formatea números grandes preservando los dígitos", () => {
    // El separador de miles depende del ICU del entorno; validamos que se
    // devuelve un string y que los dígitos se conservan.
    const out = formatNumber(1234567);
    expect(typeof out).toBe("string");
    expect(out.replace(/\D/g, "")).toBe("1234567");
  });
  it("no altera números pequeños", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

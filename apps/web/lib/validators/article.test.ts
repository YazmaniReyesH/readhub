import { describe, it, expect } from "vitest";

import {
  getFileExtension,
  validateComment,
  validateDocument,
  validateImage,
  validateTitle,
} from "./article";

/** Crea un File-like mínimo (los validadores solo leen name/type/size). */
function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as unknown as File;
}

describe("getFileExtension", () => {
  it("devuelve la extensión en minúsculas", () => {
    expect(getFileExtension("Documento.PDF")).toBe("pdf");
    expect(getFileExtension("a.b.TXT")).toBe("txt");
  });
  it("devuelve cadena vacía si no hay extensión", () => {
    expect(getFileExtension("sinextension")).toBe("");
  });
});

describe("validateTitle", () => {
  it("rechaza título vacío o solo espacios", () => {
    expect(validateTitle("").valid).toBe(false);
    expect(validateTitle("   ").valid).toBe(false);
  });
  it("rechaza títulos demasiado largos", () => {
    expect(validateTitle("a".repeat(201)).valid).toBe(false);
  });
  it("acepta un título válido", () => {
    expect(validateTitle("Mi artículo").valid).toBe(true);
  });
});

describe("validateDocument", () => {
  it("rechaza documento nulo", () => {
    expect(validateDocument(null).valid).toBe(false);
  });
  it("acepta TXT, PDF y DOCX válidos", () => {
    expect(validateDocument(fakeFile("a.txt", "text/plain", 100)).valid).toBe(true);
    expect(validateDocument(fakeFile("a.pdf", "application/pdf", 100)).valid).toBe(true);
    expect(
      validateDocument(
        fakeFile(
          "a.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          100,
        ),
      ).valid,
    ).toBe(true);
  });
  it("rechaza extensiones no permitidas", () => {
    expect(validateDocument(fakeFile("a.exe", "application/x-msdownload", 100)).valid).toBe(false);
  });
  it("rechaza documentos que superan el tamaño máximo", () => {
    const r = validateDocument(fakeFile("a.pdf", "application/pdf", 11 * 1024 * 1024));
    expect(r.valid).toBe(false);
  });
});

describe("validateImage", () => {
  it("rechaza imagen nula", () => {
    expect(validateImage(null).valid).toBe(false);
  });
  it("acepta JPG/PNG/WEBP", () => {
    expect(validateImage(fakeFile("a.png", "image/png", 100)).valid).toBe(true);
    expect(validateImage(fakeFile("a.jpg", "image/jpeg", 100)).valid).toBe(true);
    expect(validateImage(fakeFile("a.webp", "image/webp", 100)).valid).toBe(true);
  });
  it("rechaza tipos no permitidos", () => {
    expect(validateImage(fakeFile("a.gif", "image/gif", 100)).valid).toBe(false);
  });
  it("rechaza imágenes que superan el tamaño máximo", () => {
    expect(validateImage(fakeFile("a.png", "image/png", 6 * 1024 * 1024)).valid).toBe(false);
  });
});

describe("validateComment", () => {
  it("rechaza comentarios vacíos o solo espacios (BR-017)", () => {
    expect(validateComment("").valid).toBe(false);
    expect(validateComment("    ").valid).toBe(false);
  });
  it("acepta un comentario válido", () => {
    expect(validateComment("Buen artículo").valid).toBe(true);
  });
  it("rechaza comentarios demasiado largos", () => {
    expect(validateComment("a".repeat(2001)).valid).toBe(false);
  });
});

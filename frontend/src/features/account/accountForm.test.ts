import { describe, expect, it } from "vitest";
import { normalizePersonName } from "./accountForm";

// Regression tests for Spanish name normalization rules used in profile/registration forms.
describe("normalizePersonName", () => {
  it("capitalizes each word and removes mixed casing noise", () => {
    expect(normalizePersonName("JeSUs")).toBe("Jesus");
    expect(normalizePersonName("jEsuS")).toBe("Jesus");
    expect(normalizePersonName("JESUS")).toBe("Jesus");
  });

  it("keeps compound names stable word by word", () => {
    expect(normalizePersonName("Juan de la Madrid")).toBe("Juan de la Madrid");
    expect(normalizePersonName("JUAN DE LA MADRID")).toBe("Juan de la Madrid");
    expect(normalizePersonName("DE LA O")).toBe("De la O");
    expect(normalizePersonName("MARIA Y JOSE")).toBe("Maria y Jose");
  });

  it("accepts dieresis and normalizes it correctly", () => {
    expect(normalizePersonName("GÜERO")).toBe("Güero");
    expect(normalizePersonName("argüELLES")).toBe("Argüelles");
  });
});

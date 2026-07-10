import { describe, expect, it } from "vitest";
import {
  getApiErrorMessage,
  getFriendlyStatusMessage,
  isTechnicalErrorMessage,
} from "./apiError";

// Unit tests verify safe error-message normalization for user-facing UI feedback.
describe("apiError", () => {
  it("preserves friendly backend messages", () => {
    expect(
      getApiErrorMessage(
        {
          response: {
            status: 400,
            data: { message: "No se permite el campo id" },
          },
        },
        "Error al guardar",
      ),
    ).toBe("No se permite el campo id");
  });

  it("hides technical axios and runtime messages behind friendly fallbacks", () => {
    expect(
      getApiErrorMessage(
        {
          response: {
            status: 500,
            data: { message: "Request failed with status code 500" },
          },
          message: "AxiosError: Request failed with status code 500",
        },
        "Error al guardar",
      ),
    ).toBe("Ocurrió un problema interno. Intenta de nuevo.");
  });

  it("detects technical messages that should not be shown directly", () => {
    expect(isTechnicalErrorMessage("TextFieldModal is not defined")).toBe(true);
    expect(isTechnicalErrorMessage("Cannot read properties of undefined")).toBe(
      true,
    );
    expect(getFriendlyStatusMessage(403)).toBe(
      "No tienes permiso para realizar esta acción.",
    );
  });
});

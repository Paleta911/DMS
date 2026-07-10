import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { queryClient } from "../app/queryClient";

// Global test cleanup avoids state leakage across tests.
afterEach(() => {
  cleanup();
  // Clear react-query cache/mocks/stubbed globals between test cases.
  queryClient.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

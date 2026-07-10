import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppProviders } from "./app/AppProviders";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* AppProviders centralizes routing, auth, theme, i18n and React Query wiring. */}
    <AppProviders />
  </StrictMode>,
);

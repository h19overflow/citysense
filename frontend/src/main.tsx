import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import "leaflet/dist/leaflet.css";
import "./lib/leafletSetup";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider afterSignOutUrl="/">
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>
);

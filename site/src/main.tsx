import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import { Toaster } from "sonner";
import "@radix-ui/themes/styles.css";
import "./index.css";
import "./i18n";
import App from "./App.tsx";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";

function ThemedApp() {
  const { theme } = useTheme();

  return (
    <Theme appearance={theme} accentColor="indigo" grayColor="slate" radius="large">
      <App />
      <Toaster richColors position="top-center" />
    </Theme>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <ThemedApp />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
);

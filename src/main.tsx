import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UnitProvider } from "./contexts/UnitContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <UnitProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UnitProvider>
    </ThemeProvider>
  </StrictMode>
);

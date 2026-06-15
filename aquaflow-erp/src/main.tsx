import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress third-party Zustand deprecation warnings injected by Vercel Toolbar (feedback.js / instrument.js)
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("zustand")) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById("root")!).render(<App />);

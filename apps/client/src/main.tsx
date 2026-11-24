import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyTextScale, initialTextScale } from "./ui/textScale";
import "./ui/fonts";
import "./app.css";
import "./ui/strip.css";

// Before anything is shown, so every screen, error messages included, uses the player's text size.
applyTextScale(initialTextScale(), false);

createRoot(document.getElementById("root")!).render(<App />);

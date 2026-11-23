import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./ui/fonts";
import "./app.css";
import "./ui/strip.css";

createRoot(document.getElementById("root")!).render(<App />);

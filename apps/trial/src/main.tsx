import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./trial.css";

createRoot(document.getElementById("root")!).render(<App claude={(window as unknown as { claude?: unknown }).claude} />);

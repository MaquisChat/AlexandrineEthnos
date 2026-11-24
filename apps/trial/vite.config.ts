import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// One file out: the page is published to claude.ai, which serves a single HTML document.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  server: { fs: { allow: ["../.."] } },
  build: { outDir: "dist", target: "es2022" },
});

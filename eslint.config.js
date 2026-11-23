import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", ".superpowers/**", "**/playwright-report/**", "**/test-results/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/test/**", "**/e2e/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);

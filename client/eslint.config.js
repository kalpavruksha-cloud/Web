import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import hooks from "eslint-plugin-react-hooks";
import refresh from "eslint-plugin-react-refresh";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 2022, sourceType: "module", project: "./tsconfig.json" },
      globals: {
        document: "readonly",
        window: "readonly",
        localStorage: "readonly",
        HTMLElement: "readonly",
        navigator: "readonly",
        setTimeout: "readonly"
      }
    },
    plugins: { "@typescript-eslint": tseslint, "react-hooks": hooks, "react-refresh": refresh },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...hooks.configs.recommended.rules,
      "no-unused-vars": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }]
    }
  }
];

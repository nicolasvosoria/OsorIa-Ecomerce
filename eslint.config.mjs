import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = [
  // Worktrees de sesiones paralelas viven bajo .claude/; no son código del repo.
  // supabase/functions/** corre en Deno, no en este proyecto Node/Next: sus
  // únicos globals (Deno.*) y su resolución de imports (specifiers npm:/rutas
  // con extensión .ts) no existen en este toolchain.
  { ignores: [".claude/**", "supabase/functions/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-empty-function": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
];

export default eslintConfig;

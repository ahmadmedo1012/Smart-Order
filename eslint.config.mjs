import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * r126 — ESLint re-arm (audit P4-A5 finding: "the clean code is real
 * today, unprotected tomorrow"). The previous config wholesale-disabled
 * 25+ core rules; every one of them is back on after the codebase was
 * verified clean against the full set (0 errors / 0 warnings with the
 * rules active — see the r126 worklog for the numbers).
 *
 * Deliberate, documented exceptions only:
 *  - scripts/ + tests/ are plain-Node CommonJS/ESM maintenance scripts
 *    (require(), console) — not part of the Next.js app surface.
 *  - src/app/layout.tsx links /fonts/fonts.css manually on purpose
 *    (preload + unicode-range split; the CSS pipeline would reorder it —
 *    see the fonts.css Times-New-Roman post-mortem).
 *  - react-compiler + react-hooks/purity stay off (experimental lints,
 *    not part of the contract).
 */
const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript — the recommended set, re-armed.
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-non-null-assertion": "off", // strict-set only (not in recommended); 9 guarded sites pass runtime checks
    "@typescript-eslint/ban-ts-comment": "error",
    "@typescript-eslint/prefer-as-const": "error",

    // React hooks — effect correctness protects the data layer.
    "react-hooks/exhaustive-deps": "error",

    // React
    "react/no-unescaped-entities": "error",

    // Next.js — no-img-element re-armed by the r126 next/image migration.
    "@next/next/no-img-element": "error",
    "@next/next/no-html-link-for-pages": "error",

    // General JS hygiene.
    "prefer-const": "error",
    "no-console": ["error", { allow: ["error", "warn"] }],
    "no-debugger": "error",
    "no-empty": ["error", { allowEmptyCatch: true }],
    "no-irregular-whitespace": "error",
    "no-case-declarations": "error",
    "no-fallthrough": "error",
    "no-mixed-spaces-and-tabs": "error",
    "no-redeclare": "error",
    "no-unreachable": "error",
    "no-useless-escape": "error",
  },
}, {
  files: ["scripts/**/*.{js,mjs}", "tests/**/*.{js,mjs}"],
  rules: {
    // Plain-Node maintenance scripts: CommonJS + console are the norm.
    "@typescript-eslint/no-require-imports": "off",
    "no-console": "off",
  },
}, {
  files: ["src/app/layout.tsx"],
  rules: {
    // fonts.css is a deliberate manual <link> (preload + unicode-range
    // split) — the Next CSS pipeline must not absorb/reorder it.
    "@next/next/no-css-tags": "off",
  },
}, {
  ignores: [
    "node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts",
    "examples/**", "skills/**", "refs/**", "tool-results/**", "mini-services/**",
    ".zscripts/**", "download/**", "upload/**", "public/**"
  ]
}];

export default eslintConfig;

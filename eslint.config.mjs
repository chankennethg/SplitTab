import nextConfig from "eslint-config-next";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/db/migrations/**",
    ],
  },
  ...nextConfig,
  {
    rules: {
      // Catch accidental `any` usage as a warning; targeted suppressions
      // (e.g. the Proxy in db/index.ts) can still use eslint-disable-next-line.
      "@typescript-eslint/no-explicit-any": "warn",

      // False positive: our `void asyncFn()` pattern calls setState
      // asynchronously — not synchronously within the effect body.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

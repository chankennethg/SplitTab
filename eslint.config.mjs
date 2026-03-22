import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // False positive: our pattern calls setState asynchronously via `void asyncFn()`
      // inside useEffect, which is valid and does not cause synchronous cascading renders.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

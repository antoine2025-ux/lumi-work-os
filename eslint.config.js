import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "**/*.js",
      "landing-only/**",
      "prisma/seed*.js",
    ],
  },
]);

import { defineConfig } from "vitest/config";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/Japan-live-camera/" : "/",
  test: { environment: "node" },
});

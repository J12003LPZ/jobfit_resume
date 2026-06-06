import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Git worktrees live under .claude/worktrees and carry their own test files
    // whose "@/" alias would resolve here; keep them out of the main run.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});

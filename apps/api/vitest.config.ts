import { defineConfig } from "vitest/config";

// Load apps/api/.env for local runs (Node 20.12+). CI sets real env vars instead.
try { process.loadEnvFile(".env"); } catch { /* no .env file, fine */ }

export default defineConfig({
  test: { fileParallelism: false, testTimeout: 20_000 },
});

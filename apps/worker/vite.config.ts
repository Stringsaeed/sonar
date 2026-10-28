import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { join } from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(join(import.meta.dirname, "migrations"));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: { setupFiles: ["./test/apply-migrations.ts"] },
  };
});

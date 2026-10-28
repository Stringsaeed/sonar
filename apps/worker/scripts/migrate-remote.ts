import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const databaseId = process.env.D1_DATABASE_ID;
const databaseName = process.env.D1_DATABASE_NAME;
if (!databaseId || !databaseName) {
  throw new Error("D1_DATABASE_ID and D1_DATABASE_NAME must be set (sst.config.ts passes them)");
}

const workerDir = join(import.meta.dirname, "..");
const config = join(mkdtempSync(join(tmpdir(), "sonar-migrate-")), "wrangler.json");
writeFileSync(
  config,
  JSON.stringify({
    name: "sonar-migrate",
    d1_databases: [
      {
        binding: "DB",
        database_name: databaseName,
        database_id: databaseId,
        migrations_dir: join(workerDir, "migrations"),
      },
    ],
  }),
);

execFileSync(
  "pnpm",
  ["exec", "wrangler", "d1", "migrations", "apply", "DB", "--remote", "-c", config],
  {
    cwd: workerDir,
    stdio: "inherit",
  },
);

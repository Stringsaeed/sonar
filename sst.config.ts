// oxlint-disable-next-line typescript/triple-slash-reference -- SST loads its platform types this way
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "sonar",
      home: "cloudflare",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      providers: { command: "1.2.1" },
    };
  },
  async run() {
    const { createHash } = await import("node:crypto");
    const { readdirSync, readFileSync } = await import("node:fs");

    const migrationsDir = "apps/worker/migrations";
    const migrationsHash = createHash("sha256")
      .update(
        readdirSync(migrationsDir)
          .sort()
          .map((file) => readFileSync(`${migrationsDir}/${file}`, "utf8"))
          .join("\n"),
      )
      .digest("hex");

    const db = new sst.cloudflare.D1("DB");
    const room = new sst.cloudflare.DurableObject("Room", { className: "Room" });
    const matchmaker = new sst.cloudflare.DurableObject("Matchmaker", { className: "Matchmaker" });

    const migrate = new command.local.Command("MigrateDB", {
      create: "node apps/worker/scripts/migrate-remote.ts",
      // Commands run from .sst/platform by default.
      dir: $cli.paths.root,
      triggers: [migrationsHash],
      environment: {
        D1_DATABASE_ID: $interpolate`${db.databaseId}`,
        D1_DATABASE_NAME: db.nodes.database.name,
      },
    });

    const worker = new sst.cloudflare.Worker(
      "Sonar",
      {
        handler: "apps/worker/src/index.ts",
        link: [db, room, matchmaker],
        migrations: [{ tag: "v1", newSqliteClasses: ["Room", "Matchmaker"] }],
        compatibility: { date: "2026-10-19", flags: ["nodejs_compat"] },
        assets: {
          directory: "apps/web/dist/client",
          notFoundHandling: "single-page-application",
          runWorkerFirst: ["/api/*", "/ws/*"],
        },
        domain: $app.stage === "production" ? "sonar.saeed.sh" : undefined,
        url: true,
      },
      { dependsOn: [migrate] },
    );

    return { url: worker.url };
  },
});

import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite-plus";

/**
 * Dev-server only: backs the /dev/sounds soundboard. Serves raw takes from sfx/takes, reports
 * prompts and picks, and records a pick (then re-encodes) when one is chosen.
 */
export const soundboard = (): Plugin => {
  const sfx = import.meta.dirname;
  const picksFile = join(sfx, "picks.json");
  const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));

  return {
    name: "sonar-soundboard",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__sfx", (req, res) => {
        const url = new URL(req.url ?? "/", "http://local");

        if (req.method === "GET" && url.pathname === "/state") {
          const prompts = readJson(join(sfx, "prompts.json"));
          const takes = Object.fromEntries(
            Object.keys(prompts).map((cue) => {
              const dir = join(sfx, "takes", cue);
              const files = existsSync(dir)
                ? readdirSync(dir).filter((f) => f.endsWith(".mp3"))
                : [];
              return [cue, files.map((f) => Number.parseInt(f, 10)).sort((a, b) => a - b)];
            }),
          );
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ prompts, picks: readJson(picksFile), takes }));
          return;
        }

        const take = /^\/takes\/([a-z-]+)\/(\d+)\.mp3$/.exec(url.pathname);
        if (req.method === "GET" && take) {
          const file = join(sfx, "takes", take[1]!, `${take[2]}.mp3`);
          if (!existsSync(file)) {
            res.statusCode = 404;
            res.end();
            return;
          }
          res.setHeader("content-type", "audio/mpeg");
          createReadStream(file).pipe(res);
          return;
        }

        if (req.method === "POST" && url.pathname === "/pick") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            const { cue, take: chosen } = JSON.parse(body) as { cue: string; take: number };
            writeFileSync(
              picksFile,
              `${JSON.stringify({ ...readJson(picksFile), [cue]: chosen }, null, 2)}\n`,
            );
            execFileSync("node", [join(sfx, "..", "scripts", "sfx-encode.ts")], {
              stdio: "inherit",
            });
            res.end("{}");
          });
          return;
        }

        res.statusCode = 404;
        res.end();
      });
    },
  };
};

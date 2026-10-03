import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// Standalone Next changes its working directory. Resolve storage first so
// development, production and backup commands use the same configured path.
for (const file of [
  ".env.production.local",
  ".env.local",
  ".env.production",
  ".env",
])
  if (existsSync(file)) process.loadEnvFile(file);
process.env.PORTAL_DB_PATH = resolve(
  process.env.PORTAL_DB_PATH || ".portal/portal.sqlite",
);
await import(pathToFileURL(resolve(".next/standalone/server.js")).href);

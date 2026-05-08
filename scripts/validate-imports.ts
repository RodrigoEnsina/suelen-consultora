/**
 * Validates that .server.ts files are never imported from client-reachable code
 * and .client.ts files don't import server functions.
 *
 * Run: bun scripts/validate-imports.ts
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const SRC = join(import.meta.dirname ?? ".", "..", "src");

const SERVER_PATTERN = /\.server(?:\.ts|\.tsx)?$/;
const CLIENT_PATTERN = /\.client(?:\.ts|\.tsx)?$/;
const FUNCTIONS_PATTERN = /\.functions(?:\.ts|\.tsx)?$/;

// Files that are allowed to import .server modules
const ALLOWED_SERVER_IMPORTERS = [SERVER_PATTERN, FUNCTIONS_PATTERN];

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      yield full;
    }
  }
}

interface Violation {
  file: string;
  line: number;
  importPath: string;
  reason: string;
}

async function validate(): Promise<Violation[]> {
  const violations: Violation[] = [];

  for await (const filePath of walk(SRC)) {
    const rel = relative(SRC, filePath);
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");

    const isServerFile = SERVER_PATTERN.test(filePath);
    const isClientFile = CLIENT_PATTERN.test(filePath);
    const isFunctionsFile = FUNCTIONS_PATTERN.test(filePath);
    const isAllowedImporter = ALLOWED_SERVER_IMPORTERS.some((p) =>
      p.test(filePath),
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match import/require statements
      const importMatch = line.match(
        /(?:import|require)\s*\(?[^)]*['"]([^'"]+)['"]/,
      );
      if (!importMatch) continue;
      const importPath = importMatch[1];

      // Rule 1: Non-server/functions files must NOT import .server modules
      if (
        !isAllowedImporter &&
        /\.server(?:$|\/)/.test(importPath) &&
        !line.trimStart().startsWith("//")
      ) {
        violations.push({
          file: rel,
          line: i + 1,
          importPath,
          reason: `Non-server file imports a .server module. Only .server.ts and .functions.ts files may import .server modules.`,
        });
      }

      // Rule 2: .client.ts files must NOT import .functions or .server modules
      if (isClientFile) {
        if (
          /\.functions(?:$|\/)/.test(importPath) ||
          /\.server(?:$|\/)/.test(importPath)
        ) {
          if (!line.trimStart().startsWith("//")) {
            violations.push({
              file: rel,
              line: i + 1,
              importPath,
              reason: `.client.ts file imports a server-side module. This will fail the import-protection plugin.`,
            });
          }
        }
      }

      // Rule 3: .server.ts files must NOT import .client modules
      if (isServerFile && /\.client(?:$|\/)/.test(importPath)) {
        if (!line.trimStart().startsWith("//")) {
          violations.push({
            file: rel,
            line: i + 1,
            importPath,
            reason: `.server.ts file imports a .client module. Server and client modules must not cross-import.`,
          });
        }
      }
    }
  }

  return violations;
}

const violations = await validate();

if (violations.length === 0) {
  console.log("✅ Import validation passed — no .server/.client boundary violations found.");
  process.exit(0);
} else {
  console.error(
    `❌ Found ${violations.length} import boundary violation(s):\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    import: ${v.importPath}`);
    console.error(`    reason: ${v.reason}\n`);
  }
  process.exit(1);
}

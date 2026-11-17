/**
 * Fast symbol lookups for apps/api without an LSP: exact-name reference scan and unused-export list.
 *
 *   bun scripts/api-symbols.ts refs <symbol>
 *   bun scripts/api-symbols.ts dead-exports
 *
 * Text matching (word boundary) is enough here: the API is one TS workspace with no generated-name
 * collisions, and `bun run --cwd apps/api check-types` remains the authority for type correctness.
 */
import { readFile } from "node:fs/promises";

const ROOTS = ["apps/api/src", "apps/api/tests"];
// Every source is small enough to hold in memory (~19k lines); stream per file if this ever
// expands to thousands of files.

interface SourceFile {
  path: string;
  lines: string[];
}

async function loadSources(): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  for (const root of ROOTS) {
    for await (const rel of new Bun.Glob("**/*.ts").scan(root)) {
      const path = `${root}/${rel}`;
      files.push({ path, lines: (await readFile(path, "utf8")).split(/\r?\n/) });
    }
  }
  return files;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function refs(files: SourceFile[], symbol: string): void {
  const pattern = new RegExp(`\\b${escapeRegex(symbol)}\\b`);
  const declaration = new RegExp(
    `(export\\s+)?(async\\s+)?(function|const|let|class|interface|type|enum)\\s+${escapeRegex(symbol)}\\b`,
  );
  let total = 0;
  for (const file of files) {
    file.lines.forEach((line, index) => {
      if (!pattern.test(line)) return;
      total += 1;
      const kind = declaration.test(line) ? "decl" : "use ";
      console.log(`${kind} ${file.path}:${index + 1}: ${line.trim().slice(0, 140)}`);
    });
  }
  console.log(`\n${total} hit(s) for ${symbol}`);
}

function deadExports(files: SourceFile[]): void {
  const declared = /^export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/;
  const declarations = new Map<string, { path: string; line: number }>();
  for (const file of files) {
    if (file.path.includes("/tests/")) continue;
    file.lines.forEach((line, index) => {
      const name = declared.exec(line)?.[1];
      if (name && !declarations.has(name)) declarations.set(name, { path: file.path, line: index + 1 });
    });
  }

  const unused: Array<{ name: string; path: string; line: number }> = [];
  for (const [name, where] of declarations) {
    const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`);
    const usedElsewhere = files.some(
      (file) => file.path !== where.path && file.lines.some((line) => pattern.test(line)),
    );
    if (!usedElsewhere) unused.push({ name, ...where });
  }

  for (const row of unused) console.log(`${row.path}:${row.line}: ${row.name}`);
  console.log(`\n${unused.length} of ${declarations.size} exported names have no use outside their file`);
}

/** Import clauses never contain `;`, so a non-greedy run up to `from "…"` is a whole statement. */
function unusedImports(files: SourceFile[]): void {
  const statement = /(?:^|\n)import\b([^;]*?)from\s*["']([^"']+)["'];?/g;
  let total = 0;
  for (const file of files) {
    const text = file.lines.join("\n");
    for (const match of text.matchAll(statement)) {
      const [whole, clause, request] = match;
      const bindings: string[] = [];
      const namespace = /\*\s*as\s+([A-Za-z0-9_$]+)/.exec(clause);
      if (namespace) bindings.push(namespace[1]);
      const named = /\{([^}]*)\}/.exec(clause);
      if (named) {
        for (const part of named[1].split(",")) {
          const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
          if (name) bindings.push(name);
        }
      }
      const defaultName = /^\s*(?:type\s+)?([A-Za-z0-9_$]+)\s*(?:,|$)/.exec(clause);
      if (defaultName) bindings.push(defaultName[1]);

      const body = text.replace(whole, "");
      const start = text.slice(0, match.index).split("\n").length;
      for (const binding of new Set(bindings)) {
        if (new RegExp(`\\b${escapeRegex(binding)}\\b`).test(body)) continue;
        total += 1;
        console.log(`${file.path}:${start}: ${binding} (from "${request}")`);
      }
    }
  }
  console.log(`\n${total} unused import binding(s)`);
}

const [command, argument] = Bun.argv.slice(2);
const sources = await loadSources();

if (command === "refs" && argument) {
  refs(sources, argument);
} else if (command === "dead-exports") {
  deadExports(sources);
} else if (command === "unused-imports") {
  unusedImports(sources);
} else {
  console.error("usage: bun scripts/api-symbols.ts refs <symbol> | dead-exports | unused-imports");
  process.exit(1);
}

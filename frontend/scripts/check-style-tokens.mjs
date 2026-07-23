import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const checkedExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const rawColor = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\s*\()/i;
const arbitraryVisualUtility = /(?:bg|border|text|shadow|rounded|p[trblxy]?|m[trblxy]?|gap|[wh])-\[[^\]]+\]/;

const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (checkedExtensions.has(extname(entry.name))) files.push(path);
  }
}

await collect(sourceRoot);
const violations = [];
for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (rawColor.test(line)) violations.push(`${relative(sourceRoot, file)}:${index + 1} uses a raw color`);
    if (arbitraryVisualUtility.test(line)) violations.push(`${relative(sourceRoot, file)}:${index + 1} uses an arbitrary visual utility`);
  });
}

if (violations.length) {
  console.error("Use semantic tokens from src/styles/theme.css instead:\n" + violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Style token check passed (${files.length} source files).`);
}

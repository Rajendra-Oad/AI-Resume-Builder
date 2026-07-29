import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const componentExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const checkedExtensions = new Set([...componentExtensions, ".css"]);
const rawColor = /(?:#[\da-f]{3,8}(?![\da-z])|(?:rgb|hsl)a?\s*\()/i;
const arbitraryVisualUtility = /(?:bg|border|text|shadow|rounded|p[trblxy]?|m[trblxy]?|gap|[wh])-\[[^\]]+\]/;
const shadowDeclaration = /box-shadow\s*:/i;
const tokenShadow = /box-shadow\s*:\s*(?:var\(|none\b)/i;
const radiusDeclaration = /border-radius\s*:/i;
const tokenRadius = /border-radius\s*:\s*(?:var\(|inherit\b|initial\b|unset\b)/i;
const rawFontFamily = /(?:font-family\s*:|font\s*:)[^;]*(?:"DM Sans"|"DM Mono"|"Playfair Display")/i;

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
  const isCss = extname(file) === ".css";
  const isDesignSystemSource =
    isCss && (
      file.endsWith("theme.css")
      || file.endsWith("premium.css")
      || file.endsWith("dub-dashboard.css")
    );
  const isTemplatePalette = file.endsWith("features\\templates\\templateEngine.js")
    || file.endsWith("features/templates/templateEngine.js");
  if (isDesignSystemSource || isTemplatePalette) continue;
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (rawColor.test(line)) violations.push(`${relative(sourceRoot, file)}:${index + 1} uses a raw color`);
    if (!isCss && arbitraryVisualUtility.test(line)) violations.push(`${relative(sourceRoot, file)}:${index + 1} uses an arbitrary visual utility`);
    if (isCss && shadowDeclaration.test(line) && !tokenShadow.test(line)) violations.push(`${relative(sourceRoot, file)}:${index + 1} uses a raw box shadow`);
    if (isCss && radiusDeclaration.test(line) && !tokenRadius.test(line)) violations.push(`${relative(sourceRoot, file)}:${index + 1} uses a raw border radius`);
    if (isCss && rawFontFamily.test(line)) violations.push(`${relative(sourceRoot, file)}:${index + 1} uses a raw font family`);
  });
}

if (violations.length) {
  console.error("Use semantic tokens from src/styles/theme.css instead:\n" + violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Style token check passed (${files.length} component and stylesheet files).`);
}

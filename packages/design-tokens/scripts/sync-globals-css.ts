import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCssVarsString } from "../src/cssVars";

const __dirname = dirname(fileURLToPath(import.meta.url));
const globalsPath = join(__dirname, "../../../frontend/app/globals.css");

const START = "    /* AUTO-GENERATED :root START */";
const END = "    /* AUTO-GENERATED :root END */";

const css = readFileSync(globalsPath, "utf8");
const inner = buildCssVarsString()
  .split("\n")
  .slice(1, -1)
  .map((line) => `  ${line}`)
  .join("\n");

const block = `${START}\n${inner}\n${END}`;

const pattern = /    \/\* AUTO-GENERATED :root START \*\/[\s\S]*?    \/\* AUTO-GENERATED :root END \*\//;
if (!pattern.test(css)) {
  throw new Error(
    `Missing AUTO-GENERATED markers in ${globalsPath}. Wrap the :root token block with START/END comments.`,
  );
}

const next = css.replace(pattern, block);
writeFileSync(globalsPath, next, "utf8");
console.log(`Synced design tokens → ${globalsPath}`);

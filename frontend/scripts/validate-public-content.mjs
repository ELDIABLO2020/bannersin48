import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOTS = ["app", "components", "content"];
const UNSAFE_PATTERNS = [
  /\bstubbed\b/i,
  /\bmock backend\b/i,
  /\bphase\s+(?:1\.5|2|3)\b/i,
  /\bdemo (?:password|credentials|account)\b/i,
  /\bplaceholder proof\b/i,
  /\brepresentative placeholders?\b/i,
  /\breal feedback from verified customers\b/i,
];

async function sourceFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(file)));
    else if (/\.(?:ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(file);
  }
  return files;
}

function customerVisibleStrings(source, fileName) {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const strings = [];
  const visit = (node) => {
    if (
      ts.isJsxText(node) ||
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node)
    ) {
      strings.push({ text: node.text, line: file.getLineAndCharacterOfPosition(node.pos).line + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return strings;
}

const findings = [];
for (const root of ROOTS) {
  for (const file of await sourceFiles(path.resolve(root))) {
    const source = await fs.readFile(file, "utf8");
    for (const candidate of customerVisibleStrings(source, file)) {
      for (const pattern of UNSAFE_PATTERNS) {
        if (pattern.test(candidate.text)) {
          findings.push(`${path.relative(process.cwd(), file)}:${candidate.line}: ${pattern}`);
        }
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Unsafe customer-visible content found:\n- " + findings.join("\n- "));
  process.exit(1);
}

console.log("Customer-visible content scan passed.");

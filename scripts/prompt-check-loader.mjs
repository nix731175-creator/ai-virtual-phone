// Run the app's TypeScript prompt assemblers in Node without browser IndexedDB.
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";
import ts from "typescript";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXTS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx", ".mjs", ".js"];
// Keep fixture writes in the chat storage cache; Node has no browser IndexedDB.
const dexieStub = [
  "const table = { put: async () => {}, bulkPut: async () => {}, clear: async () => {} };",
  "export default class Dexie {",
  "  version() { return { stores: (schema) => {",
  "    for (const name of Object.keys(schema)) this[name] = table;",
  "    return { upgrade() {} };",
  "  } }; }",
  "  table() { return table; }",
  "  async open() {}",
  "  async transaction(_mode, _table, run) { return run(); }",
  "}",
].join("\n");

export async function resolve(specifier, context, next) {
  if (specifier === "dexie") {
    return { url: "data:text/javascript;base64," + Buffer.from(dexieStub).toString("base64"), shortCircuit: true, format: "module" };
  }
  let spec = specifier;
  if (spec.startsWith("@/")) spec = pathToFileURL(resolvePath(ROOT, spec.slice(2))).href;
  else if (spec.startsWith(".") && context.parentURL?.startsWith("file:")) {
    spec = pathToFileURL(resolvePath(dirname(fileURLToPath(context.parentURL)), spec)).href;
  } else return next(specifier, context);
  for (const ext of EXTS) {
    try { readFileSync(fileURLToPath(spec + ext)); return { url: spec + ext, shortCircuit: true, format: "module" }; } catch {}
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (!url.endsWith(".ts") && !url.endsWith(".tsx")) return next(url, context);
  const out = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
    fileName: fileURLToPath(url),
  }).outputText;
  return { format: "module", shortCircuit: true, source: out };
}

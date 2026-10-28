import { readdirSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
const source = process.argv[2], target = process.argv[3];
function visit(directory) {
 for (const entry of readdirSync(directory, { withFileTypes: true })) {
  const file = path.join(directory, entry.name);
  if (entry.isDirectory()) visit(file);
  else if (entry.isFile() && /^(licen[sc]e|copying|notice)(\.|$)/i.test(entry.name)) {
   const output = path.join(target, path.relative(source, file));
   mkdirSync(path.dirname(output), { recursive: true }); copyFileSync(file, output);
  }
 }
}
visit(source);

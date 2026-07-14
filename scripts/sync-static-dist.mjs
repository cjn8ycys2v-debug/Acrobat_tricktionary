import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "out");
const distDir = path.join(root, "dist");

if (!fs.existsSync(outDir)) {
  throw new Error("Static export output was not found. Expected Next.js to create ./out.");
}

fs.rmSync(distDir, { force: true, recursive: true });
fs.cpSync(outDir, distDir, { recursive: true });
console.log("Synced static export from out to dist.");

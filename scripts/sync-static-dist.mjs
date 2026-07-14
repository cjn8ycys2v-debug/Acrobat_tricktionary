import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "out");
const distDir = path.join(root, "dist");
const clientDir = path.join(distDir, "client");
const serverDir = path.join(distDir, "server");
const hostingSource = path.join(root, ".openai", "hosting.json");
const hostingTarget = path.join(distDir, ".openai", "hosting.json");

if (!fs.existsSync(outDir)) {
  throw new Error("Static export output was not found. Expected Next.js to create ./out.");
}

if (!fs.existsSync(hostingSource)) {
  throw new Error("Sites hosting config was not found. Expected .openai/hosting.json.");
}

fs.rmSync(distDir, { force: true, recursive: true });
fs.mkdirSync(clientDir, { recursive: true });
fs.mkdirSync(serverDir, { recursive: true });
fs.mkdirSync(path.dirname(hostingTarget), { recursive: true });

fs.cpSync(outDir, clientDir, { recursive: true });
fs.copyFileSync(hostingSource, hostingTarget);
fs.writeFileSync(path.join(serverDir, "index.js"), makeStaticFetchHandler(), "utf8");
fs.writeFileSync(path.join(serverDir, "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`, "utf8");

console.log("Synced static export to dist/client and generated dist/server/index.js.");

function makeStaticFetchHandler() {
  return `const FALLBACK_MIME_TYPE = "application/octet-stream";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const assetResponse = await fetchAsset(request, env, url.pathname);
    if (assetResponse) return assetResponse;

    if (!url.pathname.endsWith("/")) {
      const withSlash = new URL(url);
      withSlash.pathname = \`\${url.pathname}/\`;
      const slashResponse = await fetchAsset(request, env, withSlash.pathname);
      if (slashResponse) return slashResponse;
    }

    const notFound = await fetchAsset(request, env, "/404.html");
    if (!notFound) return new Response("Not found", { status: 404 });
    return new Response(notFound.body, {
      status: 404,
      headers: notFound.headers
    });
  }
};

async function fetchAsset(request, env, pathname) {
  const assets = env && env.ASSETS;
  if (!assets || typeof assets.fetch !== "function") {
    return new Response("Static asset binding is not configured.", { status: 500 });
  }

  const candidate = pathname.endsWith("/") ? \`\${pathname}index.html\` : pathname;
  const assetUrl = new URL(request.url);
  assetUrl.pathname = candidate;

  const response = await assets.fetch(new Request(assetUrl, request));
  if (response.status === 404 && candidate !== pathname) return null;
  if (response.status === 404) return null;

  const headers = new Headers(response.headers);
  if (!headers.has("content-type")) headers.set("content-type", contentTypeFor(candidate));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function contentTypeFor(pathname) {
  const index = pathname.lastIndexOf(".");
  if (index === -1) return FALLBACK_MIME_TYPE;
  return MIME_TYPES[pathname.slice(index).toLowerCase()] ?? FALLBACK_MIME_TYPE;
}
`;
}

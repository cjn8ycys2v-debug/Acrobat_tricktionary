import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  outputFileTracingRoot: dirname,
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  typedRoutes: true
};

export default nextConfig;

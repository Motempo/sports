import { existsSync, statSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const stubDir = resolvePath(dirname(fileURLToPath(import.meta.url)), "test-stubs");

const stubs = {
  "server-only": resolvePath(stubDir, "server-only.mjs"),
  "next/cache": resolvePath(stubDir, "next-cache.mjs"),
};

/**
 * Map Next's `@/*` alias onto the repo root so `node --test` can load lib
 * modules that import `@/lib/...` without the Next.js bundler. `server-only`
 * and `next/cache` are stubbed so league tests can import modules that call
 * `cachedUpstreamFetch` without starting the Next.js Data Cache.
 *
 * @param {string} specifier
 * @param {object} context
 * @param {(specifier: string, context?: object) => Promise<object>} nextResolve
 */
export async function resolve(specifier, context, nextResolve) {
  const stub = stubs[specifier];
  if (stub) return nextResolve(pathToFileURL(stub).href, context);
  if (specifier.startsWith("@/")) {
    const file = resolveExisting(resolvePath(root, specifier.slice(2)));
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}

/**
 * @param {string} target
 * @returns {string | null}
 */
function resolveExisting(target) {
  if (isFile(target)) return target;
  for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
    if (isFile(target + ext)) return target + ext;
  }
  return null;
}

/**
 * @param {string} path
 */
function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

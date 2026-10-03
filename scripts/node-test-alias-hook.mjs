import { existsSync, statSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Map Next's `@/*` alias onto the repo root so `node --test` can load lib
 * modules that import `@/lib/...` without the Next.js bundler.
 *
 * @param {string} specifier
 * @param {object} context
 * @param {(specifier: string, context?: object) => Promise<object>} nextResolve
 */
export async function resolve(specifier, context, nextResolve) {
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

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Node requires an import attribute for JSON. League modules import seed JSON
 * the way the Next bundler accepts it, so synthesize a default export here.
 *
 * @param {string} url
 * @param {object} context
 * @param {(url: string, context?: object) => Promise<object>} nextLoad
 */
export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".json")) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${source.trim()}\n`,
    };
  }
  return nextLoad(url, context);
}

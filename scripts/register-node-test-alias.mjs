import { register } from "node:module";

// Loaded via `node --import` before the test runner. Registers the `@/*` resolver.
register("./node-test-alias-hook.mjs", import.meta.url);

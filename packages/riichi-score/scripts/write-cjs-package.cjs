const { writeFileSync } = require("node:fs");

// The package itself is ESM; this nested marker makes the compiled CJS export
// genuinely loadable through the package's `require` condition.
writeFileSync("dist/cjs/package.json", '{"type":"commonjs"}\n');

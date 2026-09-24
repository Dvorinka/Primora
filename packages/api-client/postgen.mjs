// Post-generation patch: openapi-typescript-codegen's request.ts returns
// response.text() for every non-JSON response, but binary endpoints (object
// download) are typed Blob. Return a real Blob so the generated contract holds.
import { readFile, writeFile } from "node:fs/promises";

const file = new URL("./src/generated/core/request.ts", import.meta.url);
const source = await readFile(file, "utf8");
const needle = "return await response.text();";
const replacement = "return await response.blob();";

if (source.includes(replacement)) {
  process.exit(0);
}
if (!source.includes(needle)) {
  console.error("postgen: response.text() call not found in request.ts — patch manually");
  process.exit(1);
}
await writeFile(file, source.replace(needle, replacement));
console.log("postgen: patched getResponseBody to return Blob for non-JSON responses");

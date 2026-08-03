import { resolve } from "node:path";

import { createConsistentWikiSnapshot } from "../../dist/src/deployment/create-wiki-snapshot.js";

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [, , sourcePath, destinationPath] = process.argv;
  if (sourcePath === undefined || destinationPath === undefined) {
    throw new Error("Usage: node snapshot-wiki.mjs SOURCE_DB DESTINATION_DB");
  }
  await createConsistentWikiSnapshot(sourcePath, destinationPath);
}

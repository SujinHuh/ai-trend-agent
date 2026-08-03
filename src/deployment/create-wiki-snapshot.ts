import { resolve } from "node:path";

import Database from "better-sqlite3";

export async function createConsistentWikiSnapshot(sourcePath: string, destinationPath: string): Promise<void> {
  const source = new Database(resolve(sourcePath), {
    readonly: true,
    fileMustExist: true
  });
  try {
    await source.backup(resolve(destinationPath));
  } finally {
    source.close();
  }

  const snapshot = new Database(resolve(destinationPath), {
    readonly: true,
    fileMustExist: true
  });
  try {
    const integrity = snapshot.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") {
      throw new Error(`SQLite snapshot integrity_check failed: ${String(integrity)}`);
    }
  } finally {
    snapshot.close();
  }
}


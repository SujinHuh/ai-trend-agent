import Database from "better-sqlite3";

export type SqliteDatabase = Database.Database;

export function openSqliteDatabase(path: string): SqliteDatabase {
  return new Database(path);
}

export function openReadonlySqliteDatabase(path: string): SqliteDatabase {
  return new Database(path, {
    readonly: true,
    fileMustExist: true
  });
}

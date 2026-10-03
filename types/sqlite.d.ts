// Narrow declarations for the built-in API used here; @types/node 20 predates SQLite.
declare module "node:sqlite" {
  type Value = string | number | bigint | null | Uint8Array;
  interface StatementSync {
    run(...values: Value[]): {
      changes: number | bigint;
      lastInsertRowid: number | bigint;
    };
    get(...values: Value[]): Record<string, Value> | undefined;
    all(...values: Value[]): Record<string, Value>[];
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}

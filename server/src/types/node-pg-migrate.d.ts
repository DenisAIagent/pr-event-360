declare module 'node-pg-migrate' {
  export interface MigrationBuilder {
    sql(statement: string): void;
    noTransaction(): void;
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimal fake of the Supabase service-role client for unit tests. Each
 * `.from(table)` returns a chainable stub whose terminal (`maybeSingle`,
 * `single`, or awaiting the query directly) resolves to the canned result
 * seeded for that table. A seeded function may throw to exercise error paths
 * (e.g. cost-controls erring open).
 *
 * It does NOT emulate real filtering — tests assert the gate logic by seeding
 * exactly the rows the code should see for a given scenario.
 */
export type TableResult = { data: unknown; error?: unknown };
type Seed = TableResult | (() => TableResult);

function resolve(seed: Seed | undefined): TableResult {
  const r = typeof seed === "function" ? seed() : seed;
  return { data: r?.data ?? null, error: r?.error ?? null };
}

class QueryStub implements PromiseLike<TableResult> {
  constructor(private readonly getter: () => TableResult) {}

  // Chainable no-ops — return self so any filter sequence is accepted.
  select() {
    return this;
  }
  insert() {
    return this;
  }
  update() {
    return this;
  }
  upsert() {
    return this;
  }
  delete() {
    return this;
  }
  eq() {
    return this;
  }
  neq() {
    return this;
  }
  in() {
    return this;
  }
  is() {
    return this;
  }
  gt() {
    return this;
  }
  gte() {
    return this;
  }
  lt() {
    return this;
  }
  lte() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }

  maybeSingle(): Promise<TableResult> {
    return Promise.resolve().then(() => this.getter());
  }
  single(): Promise<TableResult> {
    return Promise.resolve().then(() => this.getter());
  }

  // Thenable: `await admin.from(t).select()...` resolves to the seed (list).
  then<TResult1 = TableResult, TResult2 = never>(
    onfulfilled?: ((value: TableResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.getter())
      .then(onfulfilled, onrejected);
  }
}

export function makeFakeAdmin(tables: Record<string, Seed>): SupabaseClient {
  const client = {
    from(table: string) {
      return new QueryStub(() => resolve(tables[table]));
    },
  };
  return client as unknown as SupabaseClient;
}

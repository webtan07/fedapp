import { createServerFn } from "@tanstack/react-start";
import { ensureSchema, listFedTables } from "~/db/db";
import { config, requireEnv } from "~/config";

export interface HealthResult {
  ok: boolean;
  schema: boolean;
  tables: string[];
  error?: string;
}

/**
 * Healthcheck server function: proves DB connectivity by running ensureSchema()
 * (self-heals a fresh DB) and listing the resulting FED tables.
 *
 * Returns { ok: true, schema: true, tables: [...] } on success.
 */
export const getHealth = createServerFn().handler(async (): Promise<HealthResult> => {
  try {
    requireEnv("databaseUrl");
    await ensureSchema();
    const tables = await listFedTables();
    return { ok: true, schema: true, tables };
  } catch (error) {
    return {
      ok: false,
      schema: false,
      tables: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

/** Convenience: does the deployed app have its env wired up? */
export const getConfigSummary = createServerFn().handler(async () => ({
  appBaseUrl: config.appBaseUrl,
  hasDatabase: Boolean(config.databaseUrl),
}));

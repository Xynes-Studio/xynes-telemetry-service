import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { gatewayRequestLogsRepository } from "../repositories";
import { config } from "../config";

const LOCK_KEY = 9_143_201;

export interface GatewayLogsRetentionScheduler {
  runNow: () => Promise<void>;
  stop: () => void;
}

async function tryAcquireLock(): Promise<boolean> {
  const result = await db.execute(
    sql<{ locked: boolean }>`select pg_try_advisory_lock(${LOCK_KEY}) as locked`,
  );
  return Boolean(result[0]?.locked);
}

async function releaseLock(): Promise<void> {
  await db.execute(sql`select pg_advisory_unlock(${LOCK_KEY})`);
}

export function startGatewayRequestLogsRetention(): GatewayLogsRetentionScheduler {
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const runNow = async () => {
    if (running) return;
    running = true;
    const start = Date.now();

    let hasLock = false;
    try {
      hasLock = await tryAcquireLock();
      if (!hasLock) return;

      const cutoff = new Date(
        Date.now() - config.retention.gatewayLogsDays * 24 * 60 * 60 * 1000,
      );
      const deleted = await gatewayRequestLogsRepository.deleteOlderThan(cutoff);
      console.log(
        `[Retention] gateway_request_logs prune complete: deleted=${deleted} cutoff=${cutoff.toISOString()} durationMs=${
          Date.now() - start
        }`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[Retention] gateway_request_logs prune failed after ${
          Date.now() - start
        }ms: ${message}`,
      );
    } finally {
      if (hasLock) {
        try {
          await releaseLock();
        } catch (unlockError) {
          const message =
            unlockError instanceof Error
              ? unlockError.message
              : String(unlockError);
          console.error(`[Retention] advisory unlock failed: ${message}`);
        }
      }
      running = false;
    }
  };

  timer = setInterval(() => {
    void runNow();
  }, config.retention.runIntervalMs);

  void runNow();

  return {
    runNow,
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

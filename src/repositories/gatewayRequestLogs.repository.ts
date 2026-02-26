import { lt } from "drizzle-orm";
import { db } from "../db/client";
import {
  gatewayRequestLogs,
  type GatewayRequestLog,
  type NewGatewayRequestLog,
} from "../db/schema";

export interface GatewayRequestLogsRepository {
  create(log: NewGatewayRequestLog): Promise<GatewayRequestLog>;
  deleteOlderThan(cutoff: Date): Promise<number>;
}

export function createGatewayRequestLogsRepository(): GatewayRequestLogsRepository {
  return {
    async create(log: NewGatewayRequestLog): Promise<GatewayRequestLog> {
      const [inserted] = await db
        .insert(gatewayRequestLogs)
        .values(log)
        .returning();
      if (!inserted) {
        throw new Error("Failed to insert gateway request log");
      }
      return inserted;
    },

    async deleteOlderThan(cutoff: Date): Promise<number> {
      const deleted = await db
        .delete(gatewayRequestLogs)
        .where(lt(gatewayRequestLogs.occurredAt, cutoff))
        .returning({ id: gatewayRequestLogs.id });

      return deleted.length;
    },
  };
}

export const gatewayRequestLogsRepository = createGatewayRequestLogsRepository();

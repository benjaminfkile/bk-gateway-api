import { getDb } from "../db/db";
import { IServiceLog } from "../interfaces";
import { LogLevel } from "../types";
import serviceLogSettings from "./serviceLogSettings";

const LOG_LEVEL_ORDER: LogLevel[] = ["debug", "info", "warning", "error"];

function shouldLog(current: LogLevel, min: LogLevel): boolean {
  return LOG_LEVEL_ORDER.indexOf(current) >= LOG_LEVEL_ORDER.indexOf(min);
}

const serviceLogs = {
  async insert(
    service_id: number,
    instance_id: string,
    level: LogLevel,
    message: string,
    meta?: Record<string, any>
  ) {
    const db = getDb("serviceLogs => insert()");

    // --- Check per-service log settings ---
    const settings = await serviceLogSettings.getByServiceId(service_id);
    if (settings) {
      if (!settings.enabled) return null; // Logging disabled
      if (!shouldLog(level, settings.min_level)) return null; // Below min level
    }

    const [row] = await db<IServiceLog>("service_logs")
      .insert({
        service_id,
        instance_id,
        level,
        message,
        meta: meta ?? {},
      })
      .returning("*");
    return row;
  },

  async getLogs(options: {
    service_id?: number;
    instance_id?: string;
    level?: LogLevel;
    limit?: number;
  }) {
    const db = getDb("serviceLogs => getLogs()");
    const { service_id, instance_id, level, limit = 100 } = options;

    let query = db<IServiceLog>("service_logs").select("*");
    if (service_id) query = query.where({ service_id });
    if (instance_id) query = query.andWhere({ instance_id });
    if (level) query = query.andWhere({ level });

    return query.orderBy("created_at", "desc").limit(limit);
  },

  async delete(options: { service_id?: number; instance_id?: string }) {
    const db = getDb("serviceLogs => delete()");
    const { service_id, instance_id } = options;

    let query = db<IServiceLog>("service_logs");
    if (service_id) query = query.where({ service_id });
    if (instance_id) query = query.andWhere({ instance_id });

    return query.del();
  },

  async getCount(service_id?: number) {
    const db = getDb("serviceLogs => getCount()");
    const query = db<IServiceLog>("service_logs").count<{ count: string }>(
      "id as count"
    );
    if (service_id) query.where({ service_id });
    const result = await query.first();
    return Number(result?.count ?? 0);
  },
};

export default serviceLogs;

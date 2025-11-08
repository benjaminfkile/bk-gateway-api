import { getDb } from "../db/db";
import { IServiceLogSettings } from "../interfaces";


const serviceLogSettings = {
  async getByServiceId(service_id: number) {
    const db = getDb("serviceLogSettings => getByServiceId()");
    return db<IServiceLogSettings>("service_log_settings")
      .where({ service_id })
      .first();
  },

  async upsert(
    service_id: number,
    enabled: boolean,
    min_level: IServiceLogSettings["min_level"]
  ) {
    const db = getDb("serviceLogSettings => upsert()");
    const existing = await db<IServiceLogSettings>("service_log_settings")
      .where({ service_id })
      .first();

    if (existing) {
      const [row] = await db<IServiceLogSettings>("service_log_settings")
        .where({ service_id })
        .update({ enabled, min_level, updated_at: db.fn.now() })
        .returning("*");
      return row;
    } else {
      const [row] = await db<IServiceLogSettings>("service_log_settings")
        .insert({ service_id, enabled, min_level })
        .returning("*");
      return row;
    }
  },
};

export default serviceLogSettings;

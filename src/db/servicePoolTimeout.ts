import { getDb } from "../db/db";
import { IServicePoolTimeout } from "../interfaces";

const servicePoolTimeout = {
  async insert(service_id: number, idle_timeout_ms: number) {
    const db = getDb("servicePoolTimeout => insert()");
    const [row] = await db<IServicePoolTimeout>("service_pool_timeout")
      .insert({ service_id, idle_timeout_ms })
      .returning("*");
    return row;
  },

  async update(service_id: number, idle_timeout_ms: number) {
    const db = getDb("servicePoolTimeout => update()");
    const [row] = await db<IServicePoolTimeout>("service_pool_timeout")
      .where({ service_id })
      .update({ idle_timeout_ms, last_updated: db.fn.now() })
      .returning("*");
    return row;
  },

  async getByServiceName(name: string) {
    const db = getDb("servicePoolTimeout => getByServiceName()");
    return db<IServicePoolTimeout>("service_pool_timeout as t")
      .join("services as s", "s.id", "t.service_id")
      .where("s.name", name)
      .select("t.*", "s.name")
      .first();
  },

  async getAll() {
    const db = getDb("servicePoolTimeout => getAll()");
    return db<IServicePoolTimeout>("service_pool_timeout as t")
      .join("services as s", "s.id", "t.service_id")
      .select("t.*", "s.name as service_name")
      .orderBy("s.name");
  },

  async delete(service_id: number) {
    const db = getDb("servicePoolTimeout => delete()");
    return db<IServicePoolTimeout>("service_pool_timeout")
      .where({ service_id })
      .del();
  },
};

export default servicePoolTimeout;

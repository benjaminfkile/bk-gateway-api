import { IEC2Launch } from "../interfaces";
import { getDb } from "./db";

const ec2Launch = {
  insert(instanceId: string) {
    const db = getDb();

    return db<IEC2Launch>("ec2_launch")
      .insert({ instance_id: instanceId })
      .returning("*")
      .then((rows) => rows[0]);
  },

  getByInstanceId(instanceId: string) {
    const db = getDb();
    return db<IEC2Launch>("ec2_launch")
      .where({ instance_id: instanceId })
      .first();
  },

  getAll() {
    const db = getDb();
    return db<IEC2Launch>("ec2_launch")
      .select("*")
      .orderBy("launched_at", "desc");
  },

  delete(instanceId: string) {
    const db = getDb();
    return db<IEC2Launch>("ec2_launch")
      .where({ instance_id: instanceId })
      .del();
  },
  async deleteStaleInstances(
    thresholdSeconds = 10,
    excludeInstanceId?: string
  ) {
    const db = getDb();

    const query = `
    DELETE FROM ec2_launch
    WHERE instance_id IN (
      SELECT l.instance_id
      FROM ec2_launch l
      LEFT JOIN ec2_heartbeat h
        ON l.instance_id = h.instance_id
      GROUP BY l.instance_id
      HAVING MAX(h.heartbeat_at) < (NOW() - INTERVAL '${thresholdSeconds} seconds')
         OR MAX(h.heartbeat_at) IS NULL
    )
    ${excludeInstanceId ? `AND instance_id != '${excludeInstanceId}'` : ""}
  `;

    const result = await db.raw(query);
    return result.rowCount || 0;
  },
};

export default ec2Launch;

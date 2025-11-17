import { IEC2Launch } from "../interfaces";
import { getDb } from "./db";

const ec2Launch = {
  async insert(instanceId: string, publicIp: string, privateIp: string) {
    const db = getDb();

    return db<IEC2Launch>("ec2_launch")
      .insert({ instance_id: instanceId, public_ip: publicIp, private_ip: privateIp })
      .returning("*")
      .then((rows) => rows[0]);
  },

  async updateIsLeader(instanceId: string, isLeader: boolean) {
    const db = getDb();

    const [updated] = await db<IEC2Launch>("ec2_launch") //enforced to only one leader by idx `unique_single_leader
      .where({ instance_id: instanceId })
      .update({ is_leader: isLeader })
      .returning("*");

    return updated ?? null;
  },

  async getInstanceByInstanceId(instanceId: string) {
    const db = getDb();

    const row = await db<IEC2Launch>("ec2_launch")
      .select("instance_id")
      .where({ instance_id: instanceId })
      .first();

    return row?.instance_id ?? null;
  },

  async getOldestInstanceId() {
    const db = getDb();
    const row = await db<IEC2Launch>("ec2_launch")
      .select("instance_id")
      .orderBy("launched_at", "asc")
      .first();

    return row?.instance_id ?? "-1";
  },
  async delete(instanceId: string) {
    const db = getDb();
    return db<IEC2Launch>("ec2_launch")
      .where({ instance_id: instanceId })
      .del();
  },
  async getAll() {
    const db = getDb();
    return db<IEC2Launch>("ec2_launch")
      .select("*")
      .orderBy("launched_at", "desc");
  },
  async deleteStaleInstances(thresholdSeconds = 5, excludeInstanceId?: string) {
    const db = getDb();

    const query = `
    WITH stale AS (
      SELECT l.instance_id
      FROM ec2_launch l
      LEFT JOIN ec2_heartbeat h
        ON l.instance_id = h.instance_id
      GROUP BY l.instance_id, l.launched_at
      HAVING (
        MAX(h.heartbeat_at) IS NOT NULL
        AND MAX(h.heartbeat_at) < (NOW() - INTERVAL '${thresholdSeconds} seconds')
      )
      OR (
        MAX(h.heartbeat_at) IS NULL
        AND l.launched_at < (NOW() - INTERVAL '${thresholdSeconds} seconds')
      )
    )
    DELETE FROM ec2_launch
    WHERE instance_id IN (SELECT instance_id FROM stale)
    ${excludeInstanceId ? `AND instance_id != '${excludeInstanceId}'` : ""};
  `;

    const result = await db.raw(query);

    // Return number of deleted rows safely
    const affected =
      result?.rowCount ?? result?.[0]?.rowCount ?? result?.rows?.length ?? 0;

    if (affected > 0) {
      console.log(`[LeaderService] Deleted ${affected} stale instances.`);
    }

    return affected;
  },
  async forceLeader(instanceId: string) {
    const db = getDb();

    await db.transaction(async (trx) => {
      // 1) Clear leader flag from all instances
      await trx("ec2_launch").update({ is_leader: false });

      // 2) Set this instance as leader and force it oldest timestamp
      await trx("ec2_launch")
        .where({ instance_id: instanceId })
        .update({
          is_leader: true,
          launched_at: trx.raw("to_timestamp(0)"), // 1970-01-01, youngest always wins
        });

      console.log(`[ec2Launch] Forced leader: ${instanceId}`);
    });
  },
};

export default ec2Launch;

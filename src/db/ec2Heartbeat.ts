import { getDb } from "./db";
import ec2Launch from "./ec2Launch";

interface IEC2Heartbeat {
  id?: number;
  instance_id: string;
  heartbeat_at?: string;
}

const ec2Heartbeat = {
  async beat(instanceId: string) {
    const db = getDb();
    await db<IEC2Heartbeat>("ec2_heartbeat").insert({
      instance_id: instanceId,
    });
  },
  async getLatest(instanceId: string) {
    const db = getDb();

    const row = await db<IEC2Heartbeat>("ec2_heartbeat")
      .where({ instance_id: instanceId })
      .orderBy("heartbeat_at", "desc")
      .first("heartbeat_at");

    return row?.heartbeat_at ?? null;
  },
  deleteOlderThan(instanceId: string, cutoff: Date) {
    const db = getDb();
    return db("ec2_heartbeat")
      .where({ instance_id: instanceId })
      .andWhere("heartbeat_at", "<", cutoff)
      .del();
  },
};

export default ec2Heartbeat;

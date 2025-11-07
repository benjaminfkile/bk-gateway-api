import { getDb } from "./db";

interface IEC2Heartbeat {
  id?: number;
  instance_id: string;
  heartbeat_at?: string;
}

const ec2Heartbeat = {
  insert(instanceId: string) {
    const db = getDb();

    return db<IEC2Heartbeat>("ec2_heartbeat")
      .insert({ instance_id: instanceId })
      .returning("*")
      .then((rows) => rows[0]);
  },

  getByInstanceId(instanceId: string) {
    const db = getDb();
    return db<IEC2Heartbeat>("ec2_heartbeat")
      .where({ instance_id: instanceId })
      .orderBy("heartbeat_at", "desc");
  },

  getLatest(instanceId: string) {
    const db = getDb();
    return db<IEC2Heartbeat>("ec2_heartbeat")
      .where({ instance_id: instanceId })
      .orderBy("heartbeat_at", "desc")
      .first();
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

import ec2Heartbeat from "../db/ec2Heartbeat";

const HEARTBEAT_INTERVAL_MS = 1_000; // 1 second heartbeat
const RETENTION_MINUTES = 5; // <= keep only 5 minutes of heartbeats

const activeLoops: Record<string, NodeJS.Timeout> = {};

const ec2HeartbeatService = {
  async record(uniqueInstanceId: string) {
    try {
      const record = await ec2Heartbeat.insert(uniqueInstanceId);

      const cutoff = new Date(Date.now() - RETENTION_MINUTES * 60_000);
      await ec2Heartbeat.deleteOlderThan(uniqueInstanceId, cutoff);

      return record;
    } catch (err) {
      console.error(`[Heartbeat Error] ${uniqueInstanceId}:`, err);
      throw err;
    }
  },

  startHeartbeatLoop(uniqueInstanceId: string) {
    if (activeLoops[uniqueInstanceId]) return;

    activeLoops[uniqueInstanceId] = setInterval(() => {
      this.record(uniqueInstanceId).catch((err) =>
        console.error(`[Heartbeat Failure] ${uniqueInstanceId}`, err)
      );
    }, HEARTBEAT_INTERVAL_MS);
  },

  stopHeartbeatLoop(uniqueInstanceId: string) {
    const interval = activeLoops[uniqueInstanceId];
    if (interval) {
      clearInterval(interval);
      delete activeLoops[uniqueInstanceId];
    }
  },

  async getLatest(uniqueInstanceId: string) {
    return ec2Heartbeat.getLatest(uniqueInstanceId);
  },

  async getAllForInstance(uniqueInstanceId: string) {
    return ec2Heartbeat.getByInstanceId(uniqueInstanceId);
  },
};

export default ec2HeartbeatService;

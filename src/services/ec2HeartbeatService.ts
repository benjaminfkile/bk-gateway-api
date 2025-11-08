import ec2Heartbeat from "../db/ec2Heartbeat";
import leaderElectionService from "./leaderElectionService";

const HEARTBEAT_INTERVAL_MS = 1_000; // every second
const RETENTION_MINUTES = 5; // keep only 5 minutes of data

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

  /**
   * Begins heartbeat loop for the instance.
   * Every tick inserts a heartbeat and re-evaluates leader status.
   */
  startHeartbeatLoop(uniqueInstanceId: string) {
    if (activeLoops[uniqueInstanceId]) return;

    console.log(`[Heartbeat] Starting loop for ${uniqueInstanceId}`);

    activeLoops[uniqueInstanceId] = setInterval(async () => {
      try {
        await this.record(uniqueInstanceId);
        await leaderElectionService.evaluate();
      } catch (err) {
        console.error(`[Heartbeat Failure] ${uniqueInstanceId}`, err);
      }
    }, HEARTBEAT_INTERVAL_MS);
  },

  stopHeartbeatLoop(uniqueInstanceId: string) {
    const interval = activeLoops[uniqueInstanceId];
    if (interval) {
      clearInterval(interval);
      delete activeLoops[uniqueInstanceId];
      console.log(`[Heartbeat] Stopped loop for ${uniqueInstanceId}`);
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

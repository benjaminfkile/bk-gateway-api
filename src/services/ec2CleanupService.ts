import ec2Launch from "../db/ec2Launch";
import { addJitter } from "../utils/jitter";

const CLEANUP_INTERVAL_MS = 5_000; // 5s base interval
const STALE_THRESHOLD_SECONDS = 5; // consider instance stale if no heartbeat for >5s

let cleanupLoop: NodeJS.Timeout | null = null;
let instanceId: string | null = null;

const ec2CleanupService = {
  async cleanupStaleInstances() {
    try {
      if (!instanceId) {
        console.warn("[Cleanup] Skipping — instanceId not set yet.");
        return;
      }

      const deletedCount = await ec2Launch.deleteStaleInstances(
        STALE_THRESHOLD_SECONDS,
        instanceId // exclude this instance
      );

      if (deletedCount > 0) {
        console.log(`[Cleanup] Deleted ${deletedCount} stale EC2 instances`);
      }
    } catch (err) {
      console.error("[Cleanup Error]:", err);
    }
  },

  async start(uniqueInstanceId: string) {
    if (cleanupLoop) {
      console.log("[Cleanup] Loop already running");
      return;
    }

    instanceId = uniqueInstanceId;

    const jitteredInterval = addJitter(CLEANUP_INTERVAL_MS, 0.5); // ±50%
    console.log(`[Cleanup] Starting loop (interval: ${jitteredInterval / 1000}s)`);

    cleanupLoop = setInterval(() => {
      this.cleanupStaleInstances();
    }, jitteredInterval);
  },

  stop() {
    if (cleanupLoop) {
      clearInterval(cleanupLoop);
      cleanupLoop = null;
      console.log("[Cleanup] Loop stopped");
    }
  },
};

export default ec2CleanupService;

import ec2Heartbeat from "../db/ec2Heartbeat";
import ec2Launch from "../db/ec2Launch";
// import socketIOService from "../socket.io/socketIOService";

const STALE_INSTANCE_THRESHOL_SECONDS = 15;

const leaderElectionService = {
  instanceId: "",
  isLeader: false,
  leaderId: null,
  lastChecked: null as Date | null,
  interval: null as NodeJS.Timeout | null,

  /**
   * Initialize election system for this instance.
   */
  async init(instanceId: string) {
    this.instanceId = instanceId;
    // socketIOService.init(false, instanceId)
    console.log(`[leaderElectionService] Initializing for ${instanceId}`);

    // Do first-time evaluation immediately
    await this.evaluate();

    // Then set it to run every 5 seconds
    this.interval = setInterval(() => this.evaluate(), 5000);
  },

  async evaluate() {
    try {
      await ec2Launch.deleteStaleInstances(
        STALE_INSTANCE_THRESHOL_SECONDS,
        this.instanceId
      );
      const hasInstanceRecord = await ec2Launch.getInstanceByInstanceId(
        this.instanceId
      );

      if (hasInstanceRecord) {
        const hasHeartbeat = await ec2Heartbeat.getLatest(this.instanceId);

        if (hasHeartbeat) {
          await ec2Heartbeat.beat(this.instanceId);

          const oldestInstanceId = await ec2Launch.getOldestInstanceId();

          if (oldestInstanceId === "-1") {
            await ec2Launch.updateIsLeader(this.instanceId, true);
            this.isLeader = true
            // socketIOService.setRole(true);
          } else if (
            oldestInstanceId !== "-1" &&
            oldestInstanceId === this.instanceId
          ) {
            await ec2Launch.updateIsLeader(this.instanceId, true);
            this.isLeader = true;
            // socketIOService.setRole(true);
          } else {
            this.isLeader = false;
            // socketIOService.setRole(false)
          }
        } else {
          console.log(
            "[LeaderService]: Inserting first ec2_heartbeat record for",
            this.instanceId
          );
          await ec2Heartbeat.beat(this.instanceId);
        }
      } else {
        console.log(
          "[LeaderService]: inserting first ec2_launch record for:",
          this.instanceId
        );
        await ec2Launch.insert(this.instanceId);
      }

      this.lastChecked = new Date();
    } catch (err) {
      console.error("[LeaderService Error]:", err);
    }
  },
};

export default leaderElectionService;

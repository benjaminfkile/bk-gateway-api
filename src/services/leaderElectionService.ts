import ec2Heartbeat from "../db/ec2Heartbeat";
import ec2Launch from "../db/ec2Launch";
import { IAboutMe } from "../interfaces";

const STALE_INSTANCE_THRESHOL_SECONDS = 15;

const leaderElectionService = {
  aboutMe: {} as IAboutMe,
  lastChecked: null as Date | null,
  interval: null as NodeJS.Timeout | null,

  /**
   * Initialize election system for this instance.
   */
  async init(instanceId: string, publicIp: string) {
    this.aboutMe.myInstanceId = instanceId;
    this.aboutMe.myIp = publicIp;
    this.aboutMe.amILeader =
      process.env.ASSUME_LEADER === "true" ? true : false;
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
        this.aboutMe.myInstanceId
      );
      const hasInstanceRecord = await ec2Launch.getInstanceByInstanceId(
        this.aboutMe.myInstanceId
      );

      if (hasInstanceRecord) {
        const hasHeartbeat = await ec2Heartbeat.getLatest(
          this.aboutMe.myInstanceId
        );

        if (hasHeartbeat) {
          await ec2Heartbeat.beat(this.aboutMe.myInstanceId);

          const oldestInstanceId = await ec2Launch.getOldestInstanceId();

          if (oldestInstanceId === "-1") {
            await ec2Launch.updateIsLeader(this.aboutMe.myInstanceId, true);
            this.aboutMe.amILeader = true;
          } else if (
            oldestInstanceId !== "-1" &&
            oldestInstanceId === this.aboutMe.myInstanceId
          ) {
            await ec2Launch.updateIsLeader(this.aboutMe.myInstanceId, true);
            this.aboutMe.amILeader = true;
          } else {
            this.aboutMe.amILeader = false;
          }
        } else {
          console.log(
            "[LeaderService]: Inserting first ec2_heartbeat record for",
            this.aboutMe.myInstanceId
          );
          await ec2Heartbeat.beat(this.aboutMe.myInstanceId);
        }
      } else {
        console.log(
          "[LeaderService]: inserting first ec2_launch record for:",
          this.aboutMe.myInstanceId
        );
        await ec2Launch.insert(this.aboutMe.myInstanceId, this.aboutMe.myIp);
      }

      this.lastChecked = new Date();
    } catch (err) {
      console.error("[LeaderService Error]:", err);
    }
  },
};

export default leaderElectionService;

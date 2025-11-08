import ec2Launch from "../db/ec2Launch";
import ec2HeartbeatService from "./ec2HeartbeatService";

async function waitForLaunchRecord(uniqueInstanceId: string, maxRetries = 5, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    const exists = await ec2Launch.getByInstanceId(uniqueInstanceId);
    if (exists) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  console.warn(`[Launch] Timeout waiting for ec2_launch row for ${uniqueInstanceId}`);
  return false;
}

const ec2LaunchService = {
  async startInstance(uniqueInstanceId: string) {
    let record = await ec2Launch.getByInstanceId(uniqueInstanceId);

    if (!record) {
      record = await ec2Launch.insert(uniqueInstanceId);
      console.log(`[Launch] Recorded EC2 instance: ${uniqueInstanceId}`);
    } else {
      console.log(`[Launch] Instance already recorded: ${uniqueInstanceId}`);
    }

    //Ensure launch record is visible before starting heartbeat
    const confirmed = await waitForLaunchRecord(uniqueInstanceId);
    if (confirmed) {
      ec2HeartbeatService.startHeartbeatLoop(uniqueInstanceId);
    } else {
      console.warn(`[Launch] Skipping heartbeat start — launch record not confirmed`);
    }

    return record;
  },

  async stopInstance(uniqueInstanceId: string) {
    console.log(`[Shutdown] Deleting EC2 instance: ${uniqueInstanceId}`);
    await ec2HeartbeatService.stopHeartbeatLoop(uniqueInstanceId);
    await ec2Launch.delete(uniqueInstanceId);
  },

  async getLaunches() {
    return ec2Launch.getAll();
  },

  async getLaunch(uniqueInstanceId: string) {
    return ec2Launch.getByInstanceId(uniqueInstanceId);
  },
};

export default ec2LaunchService;

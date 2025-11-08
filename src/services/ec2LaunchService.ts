import ec2Launch from "../db/ec2Launch";
import ec2HeartbeatService from "./ec2HeartbeatService";

const ec2LaunchService = {
  async startInstance(uniqueInstanceId: string) {
    let record = await ec2Launch.getByInstanceId(uniqueInstanceId);

    if (!record) {
      record = await ec2Launch.insert(uniqueInstanceId);
      console.log(`[Launch] Recorded EC2 instance: ${uniqueInstanceId}`);
    } else {
      console.log(`[Launch] Instance already recorded: ${uniqueInstanceId}`);
    }

    // 🔹 First heartbeat happens synchronously to confirm FK validity
    try {
      await ec2HeartbeatService.record(uniqueInstanceId);
      console.log(`[Launch] Initial heartbeat OK for ${uniqueInstanceId}`);
    } catch (err) {
      console.error(`[Launch] Initial heartbeat failed, retrying...`, err);
      await new Promise((r) => setTimeout(r, 1000));
      await ec2HeartbeatService.record(uniqueInstanceId);
    }

    // 🔹 Once initial heartbeat is successful, start loop
    ec2HeartbeatService.startHeartbeatLoop(uniqueInstanceId);

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

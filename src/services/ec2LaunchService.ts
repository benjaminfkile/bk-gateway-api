import ec2Launch from "../db/ec2Launch";
import ec2HeartbeatService from "./ec2HeartbeatService";
import leaderElectionService from "./leaderElectionService";

const ec2LaunchService = {
  /**
   * Start this EC2 instance in the cluster and initialize leader election.
   */
  async startInstance(uniqueInstanceId: string) {
    console.log(`[Launch] Initializing EC2 instance ${uniqueInstanceId}...`);

    // 🔹 Register and start leader election service (handles insert + heartbeat + election)
    await leaderElectionService.init(uniqueInstanceId);

    // 🔹 Grab current election state
    const { isLeader, leaderId, instanceId } = leaderElectionService.getState();

    console.log(
      `[Launch] Instance ${instanceId} started. Leader: ${leaderId} (isLeader=${isLeader})`
    );

    return { isLeader, leaderId, instanceId };
  },

  /**
   * Stop this EC2 instance and clean up related data.
   */
  async stopInstance(uniqueInstanceId: string) {
    console.log(`[Shutdown] Stopping EC2 instance: ${uniqueInstanceId}`);
    await ec2HeartbeatService.stopHeartbeatLoop(uniqueInstanceId);
    await ec2Launch.delete(uniqueInstanceId);

    console.log(
      `[Shutdown] Instance ${uniqueInstanceId} removed from registry.`
    );
  },

  /**
   * Get all EC2 launches.
   */
  async getLaunches() {
    return ec2Launch.getAll();
  },

  /**
   * Get a specific EC2 launch record.
   */
  async getLaunch(uniqueInstanceId: string) {
    return ec2Launch.getByInstanceId(uniqueInstanceId);
  },
};

export default ec2LaunchService;

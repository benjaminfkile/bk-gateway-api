jest.mock("../src/db/ec2Launch", () => ({
  __esModule: true,
  default: {
    deleteStaleInstances: jest.fn().mockResolvedValue(0),
    getInstanceByInstanceId: jest.fn(),
    insert: jest.fn().mockResolvedValue({}),
    updateIsLeader: jest.fn().mockResolvedValue({}),
    getOldestInstanceId: jest.fn(),
    forceLeader: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../src/db/ec2Heartbeat", () => ({
  __esModule: true,
  default: {
    getLatest: jest.fn(),
    beat: jest.fn().mockResolvedValue(undefined),
  },
}));

import leaderElectionService from "../src/services/leaderElectionService";
import ec2Launch from "../src/db/ec2Launch";
import ec2Heartbeat from "../src/db/ec2Heartbeat";

const mockEc2Launch = ec2Launch as unknown as {
  deleteStaleInstances: jest.Mock;
  getInstanceByInstanceId: jest.Mock;
  insert: jest.Mock;
  updateIsLeader: jest.Mock;
  getOldestInstanceId: jest.Mock;
  forceLeader: jest.Mock;
};

const mockEc2Heartbeat = ec2Heartbeat as unknown as {
  getLatest: jest.Mock;
  beat: jest.Mock;
};

const MY_INSTANCE_ID = "i-test-123";

beforeEach(() => {
  leaderElectionService.aboutMe = {
    amILeader: false,
    myInstanceId: MY_INSTANCE_ID,
    publicIp: "1.2.3.4",
    privateIp: "10.0.0.1",
  };
  leaderElectionService.lastChecked = null;

  jest.clearAllMocks();

  mockEc2Launch.deleteStaleInstances.mockResolvedValue(0);
  mockEc2Launch.insert.mockResolvedValue({});
  mockEc2Launch.updateIsLeader.mockResolvedValue({});
  mockEc2Launch.forceLeader.mockResolvedValue(undefined);
  mockEc2Heartbeat.beat.mockResolvedValue(undefined);

  delete process.env.FORCE_LEADER;
});

describe("leaderElectionService.evaluate()", () => {
  it("inserts an instance record and does not call beat() when instance is not yet registered", async () => {
    mockEc2Launch.getInstanceByInstanceId.mockResolvedValue(null);

    await leaderElectionService.evaluate();

    expect(mockEc2Launch.insert).toHaveBeenCalledWith(
      MY_INSTANCE_ID,
      "1.2.3.4",
      "10.0.0.1"
    );
    expect(mockEc2Heartbeat.beat).not.toHaveBeenCalled();
  });

  it("calls beat() when instance is registered and a heartbeat exists", async () => {
    mockEc2Launch.getInstanceByInstanceId.mockResolvedValue(MY_INSTANCE_ID);
    mockEc2Heartbeat.getLatest.mockResolvedValue("2024-01-01T00:00:00Z");
    mockEc2Launch.getOldestInstanceId.mockResolvedValue(MY_INSTANCE_ID);

    await leaderElectionService.evaluate();

    expect(mockEc2Heartbeat.beat).toHaveBeenCalledWith(MY_INSTANCE_ID);
  });

  it("sets amILeader = true and calls updateIsLeader when this instance is the oldest", async () => {
    mockEc2Launch.getInstanceByInstanceId.mockResolvedValue(MY_INSTANCE_ID);
    mockEc2Heartbeat.getLatest.mockResolvedValue("2024-01-01T00:00:00Z");
    mockEc2Launch.getOldestInstanceId.mockResolvedValue(MY_INSTANCE_ID);

    await leaderElectionService.evaluate();

    expect(leaderElectionService.aboutMe.amILeader).toBe(true);
    expect(mockEc2Launch.updateIsLeader).toHaveBeenCalledWith(
      MY_INSTANCE_ID,
      true
    );
  });

  it("sets amILeader = false when another instance is older", async () => {
    mockEc2Launch.getInstanceByInstanceId.mockResolvedValue(MY_INSTANCE_ID);
    mockEc2Heartbeat.getLatest.mockResolvedValue("2024-01-01T00:00:00Z");
    mockEc2Launch.getOldestInstanceId.mockResolvedValue("i-other-456");

    await leaderElectionService.evaluate();

    expect(leaderElectionService.aboutMe.amILeader).toBe(false);
    expect(mockEc2Launch.updateIsLeader).not.toHaveBeenCalled();
  });

  it("forces leader and sets amILeader = true when FORCE_LEADER=true env var is set", async () => {
    process.env.FORCE_LEADER = "true";
    mockEc2Launch.getInstanceByInstanceId.mockResolvedValue(MY_INSTANCE_ID);
    mockEc2Heartbeat.getLatest.mockResolvedValue("2024-01-01T00:00:00Z");

    await leaderElectionService.evaluate();

    expect(leaderElectionService.aboutMe.amILeader).toBe(true);
    expect(mockEc2Launch.forceLeader).toHaveBeenCalledWith(MY_INSTANCE_ID);
  });

  it("calls beat() once and skips leader check when instance has no prior heartbeat", async () => {
    mockEc2Launch.getInstanceByInstanceId.mockResolvedValue(MY_INSTANCE_ID);
    mockEc2Heartbeat.getLatest.mockResolvedValue(null);

    await leaderElectionService.evaluate();

    expect(mockEc2Heartbeat.beat).toHaveBeenCalledTimes(1);
    expect(mockEc2Heartbeat.beat).toHaveBeenCalledWith(MY_INSTANCE_ID);
    expect(mockEc2Launch.updateIsLeader).not.toHaveBeenCalled();
  });
});

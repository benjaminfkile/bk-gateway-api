import { handleDeploy } from "../src/services/deployService";

// Mock Dockerode — the gateway must NOT call any Docker methods for self-deploys
jest.mock("dockerode", () => {
  const mockStop = jest.fn().mockResolvedValue(undefined);
  const mockStart = jest.fn().mockResolvedValue(undefined);
  const mockGetContainer = jest.fn(() => ({ stop: mockStop, start: mockStart }));
  const mockListContainers = jest.fn().mockResolvedValue([]);
  const mockFollowProgress = jest.fn((stream: any, cb: (err: null) => void) => cb(null));
  const mockPull = jest.fn((image: string, cb: (err: null, stream: {}) => void) => cb(null, {}));

  const MockDockerode: any = jest.fn().mockImplementation(() => ({
    pull: mockPull,
    modem: { followProgress: mockFollowProgress },
    getContainer: mockGetContainer,
    listContainers: mockListContainers,
  }));

  MockDockerode.__mocks = { mockPull, mockFollowProgress, mockGetContainer, mockListContainers, mockStop, mockStart };

  return MockDockerode;
});

const mockPublish = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn();
const mockDel = jest.fn();

jest.mock("../src/db/redis", () => ({
  getRedis: jest.fn(() => ({
    publish: mockPublish,
    set: mockSet,
    del: mockDel,
  })),
}));

function getDockerMocks() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("dockerode").__mocks as {
    mockPull: jest.Mock;
    mockFollowProgress: jest.Mock;
    mockGetContainer: jest.Mock;
    mockListContainers: jest.Mock;
    mockStop: jest.Mock;
    mockStart: jest.Mock;
  };
}

beforeEach(() => {
  mockPublish.mockClear();
  mockSet.mockClear();
  mockDel.mockClear();
  const d = getDockerMocks();
  d.mockPull.mockClear();
  d.mockFollowProgress.mockClear();
  d.mockGetContainer.mockClear();
  d.mockListContainers.mockClear();
  d.mockStop.mockClear();
  d.mockStart.mockClear();
});

describe("watchdog contract — gateway side", () => {
  const imageUri = "123.dkr.ecr.us-east-1.amazonaws.com/bk-gateway-api:latest";
  const instanceId = "i-123";

  it("publishes to deploy:gateway-self with correct payload when service is bk-gateway-api", async () => {
    await handleDeploy("bk-gateway-api", imageUri, instanceId);

    expect(mockPublish).toHaveBeenCalledWith(
      "deploy:gateway-self",
      JSON.stringify({ service: "bk-gateway-api", imageUri, instanceId })
    );
  });

  it("does not call any Dockerode methods when service is bk-gateway-api", async () => {
    const d = getDockerMocks();

    await handleDeploy("bk-gateway-api", imageUri, instanceId);

    expect(d.mockPull).not.toHaveBeenCalled();
    expect(d.mockListContainers).not.toHaveBeenCalled();
    expect(d.mockGetContainer).not.toHaveBeenCalled();
    expect(d.mockStop).not.toHaveBeenCalled();
    expect(d.mockStart).not.toHaveBeenCalled();
  });

  it("does not acquire or release any Redis lock when service is bk-gateway-api", async () => {
    await handleDeploy("bk-gateway-api", imageUri, instanceId);

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("returns after publishing without performing any additional work", async () => {
    await handleDeploy("bk-gateway-api", imageUri, instanceId);

    // Only the gateway-self publish — no result publish, no status set
    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith("deploy:gateway-self", expect.any(String));
  });
});

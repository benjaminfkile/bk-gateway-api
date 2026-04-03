import { handleDeploy } from "../src/services/deployService";

// All docker mocks defined inside the factory (jest.mock is hoisted)
jest.mock("dockerode", () => {
  const mockStop = jest.fn().mockResolvedValue(undefined);
  const mockStart = jest.fn().mockResolvedValue(undefined);
  const mockGetContainer = jest.fn(() => ({ stop: mockStop, start: mockStart }));
  const mockListContainers = jest.fn().mockResolvedValue([
    { Id: "abc123", Names: ["/my-service"] },
  ]);
  const mockFollowProgress = jest.fn((stream: any, cb: (err: null) => void) => cb(null));
  const mockPull = jest.fn((image: string, cb: (err: null, stream: {}) => void) => cb(null, {}));

  const MockDockerode: any = jest.fn().mockImplementation(() => ({
    pull: mockPull,
    modem: { followProgress: mockFollowProgress },
    getContainer: mockGetContainer,
    listContainers: mockListContainers,
  }));

  // Expose mocks for test access
  MockDockerode.__mocks = { mockPull, mockFollowProgress, mockGetContainer, mockListContainers, mockStop, mockStart };

  return MockDockerode;
});

// Mock redis
const mockSet = jest.fn();
const mockDel = jest.fn();
const mockPublish = jest.fn();

jest.mock("../src/db/redis", () => ({
  getRedis: jest.fn(() => ({
    set: mockSet,
    del: mockDel,
    publish: mockPublish,
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
  const d = getDockerMocks();
  d.mockPull.mockClear();
  d.mockPull.mockImplementation((image: string, cb: (err: null, stream: {}) => void) => cb(null, {}));
  d.mockFollowProgress.mockClear();
  d.mockFollowProgress.mockImplementation((stream: any, cb: (err: null) => void) => cb(null));
  d.mockGetContainer.mockClear();
  d.mockGetContainer.mockImplementation(() => ({ stop: d.mockStop, start: d.mockStart }));
  d.mockListContainers.mockClear();
  d.mockListContainers.mockResolvedValue([{ Id: "abc123", Names: ["/my-service"] }]);
  d.mockStop.mockClear();
  d.mockStop.mockResolvedValue(undefined);
  d.mockStart.mockClear();
  d.mockStart.mockResolvedValue(undefined);

  mockSet.mockClear();
  mockDel.mockClear();
  mockPublish.mockClear();
});

describe("handleDeploy", () => {
  it("pulls image, stops/starts container, publishes success, sets status, releases lock when lock is acquired", async () => {
    mockSet.mockResolvedValueOnce("OK"); // lock acquired
    const d = getDockerMocks();

    await handleDeploy("my-service", "123.dkr.ecr.us-east-1.amazonaws.com/my-service:latest", "i-123");

    // Lock acquired
    expect(mockSet).toHaveBeenCalledWith("deploy:my-service:lock", "i-123", "EX", 120, "NX");

    // Docker pull called
    expect(d.mockPull).toHaveBeenCalledWith(
      "123.dkr.ecr.us-east-1.amazonaws.com/my-service:latest",
      expect.any(Function)
    );

    // Container stopped and started
    expect(d.mockGetContainer).toHaveBeenCalledWith("abc123");
    expect(d.mockStop).toHaveBeenCalled();
    expect(d.mockStart).toHaveBeenCalled();

    // Publishes success result
    expect(mockPublish).toHaveBeenCalledWith(
      "deploy:result:i-123",
      JSON.stringify({ service: "my-service", imageUri: "123.dkr.ecr.us-east-1.amazonaws.com/my-service:latest", success: true })
    );

    // Sets status key
    expect(mockSet).toHaveBeenCalledWith(
      "deploy:status:my-service",
      JSON.stringify({ service: "my-service", imageUri: "123.dkr.ecr.us-east-1.amazonaws.com/my-service:latest", success: true })
    );

    // Releases lock
    expect(mockDel).toHaveBeenCalledWith("deploy:my-service:lock");
  });

  it("returns without calling docker pull when lock is already held", async () => {
    mockSet.mockResolvedValueOnce(null); // lock not acquired
    const d = getDockerMocks();

    await handleDeploy("my-service", "123.dkr.ecr.us-east-1.amazonaws.com/my-service:latest", "i-999");

    expect(d.mockPull).not.toHaveBeenCalled();
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("publishes failure result with success:false and error when docker pull throws", async () => {
    mockSet.mockResolvedValueOnce("OK"); // lock acquired
    const d = getDockerMocks();
    d.mockPull.mockImplementationOnce((_img: string, cb: any) => {
      cb(new Error("pull failed"));
    });

    await handleDeploy("my-service", "bad-image:latest", "i-123");

    expect(mockPublish).toHaveBeenCalledWith(
      "deploy:result:i-123",
      expect.stringContaining('"success":false')
    );
    expect(mockPublish).toHaveBeenCalledWith(
      "deploy:result:i-123",
      expect.stringContaining('"error":"pull failed"')
    );
    expect(mockDel).toHaveBeenCalledWith("deploy:my-service:lock");
  });

  it("publishes to deploy:gateway-self and returns without touching Dockerode when service is bk-gateway-api", async () => {
    const d = getDockerMocks();

    await handleDeploy("bk-gateway-api", "123.dkr.ecr.us-east-1.amazonaws.com/bk-gateway-api:latest", "i-123");

    expect(mockPublish).toHaveBeenCalledWith(
      "deploy:gateway-self",
      JSON.stringify({ service: "bk-gateway-api", imageUri: "123.dkr.ecr.us-east-1.amazonaws.com/bk-gateway-api:latest", instanceId: "i-123" })
    );

    expect(d.mockPull).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });
});



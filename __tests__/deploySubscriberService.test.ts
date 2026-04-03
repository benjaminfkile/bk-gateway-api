import deploySubscriberService from "../src/services/deploySubscriberService";

// Capture handlers so tests can trigger them
let pmessageHandler: (pattern: string, channel: string, message: string) => void;

jest.mock("ioredis", () => {
  const mockOn = jest.fn((event: string, handler: (...args: any[]) => void) => {
    if (event === "pmessage") {
      // Store reference in module-level variable via the exposed accessor
      (MockClusterInstance as any).__pmessageHandler = handler;
    }
  });

  const mockPsubscribe = jest.fn();

  const MockClusterInstance = {
    once: jest.fn(),
    on: mockOn,
    psubscribe: mockPsubscribe,
    __pmessageHandler: null as any,
  };

  const MockCluster = jest.fn().mockImplementation(() => MockClusterInstance);
  (MockCluster as any).__instance = MockClusterInstance;

  return { Cluster: MockCluster };
});

const mockHandleDeploy = jest.fn().mockResolvedValue(undefined);

jest.mock("../src/services/deployService", () => ({
  handleDeploy: (...args: any[]) => mockHandleDeploy(...args),
}));

function getClusterInstance() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("ioredis").Cluster.__instance as {
    once: jest.Mock;
    on: jest.Mock;
    psubscribe: jest.Mock;
    __pmessageHandler: ((pattern: string, channel: string, message: string) => void) | null;
  };
}

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Cluster } = require("ioredis");
  Cluster.mockClear();
  const inst = getClusterInstance();
  inst.once.mockClear();
  inst.on.mockClear();
  inst.psubscribe.mockClear();
  inst.__pmessageHandler = null;
  mockHandleDeploy.mockClear();
  mockHandleDeploy.mockResolvedValue(undefined);
});

describe("deploySubscriberService", () => {
  it("calls handleDeploy with correct args for a valid deploy message", async () => {
    deploySubscriberService.init("redis-host", 6379, "i-123");

    const inst = getClusterInstance();
    const handler = inst.__pmessageHandler!;

    const payload = JSON.stringify({ service: "lease-tracker-api", imageUri: "123.dkr.ecr.us-east-1.amazonaws.com/lease-tracker-api:latest" });
    handler("deploy:*", "deploy:lease-tracker-api", payload);

    await Promise.resolve();

    expect(mockHandleDeploy).toHaveBeenCalledWith(
      "lease-tracker-api",
      "123.dkr.ecr.us-east-1.amazonaws.com/lease-tracker-api:latest",
      "i-123"
    );
  });

  it("silently ignores messages on deploy:result:* channels", async () => {
    deploySubscriberService.init("redis-host", 6379, "i-123");

    const inst = getClusterInstance();
    const handler = inst.__pmessageHandler!;

    const payload = JSON.stringify({ service: "some-service", imageUri: "some-image:latest" });
    handler("deploy:*", "deploy:result:i-123", payload);

    await Promise.resolve();

    expect(mockHandleDeploy).not.toHaveBeenCalled();
  });

  it("silently ignores messages on deploy:gateway-self channel", async () => {
    deploySubscriberService.init("redis-host", 6379, "i-123");

    const inst = getClusterInstance();
    const handler = inst.__pmessageHandler!;

    const payload = JSON.stringify({ service: "bk-gateway-api", imageUri: "some-image:latest" });
    handler("deploy:*", "deploy:gateway-self", payload);

    await Promise.resolve();

    expect(mockHandleDeploy).not.toHaveBeenCalled();
  });

  it("logs error and does not throw when message has malformed JSON", async () => {
    deploySubscriberService.init("redis-host", 6379, "i-123");

    const inst = getClusterInstance();
    const handler = inst.__pmessageHandler!;

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      handler("deploy:*", "deploy:some-service", "not-valid-json");
    }).not.toThrow();

    await Promise.resolve();

    expect(mockHandleDeploy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to parse message"),
      expect.anything()
    );

    consoleSpy.mockRestore();
  });
});

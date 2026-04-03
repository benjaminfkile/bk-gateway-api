import { initRedis, getRedis } from "../src/db/redis";

jest.mock("ioredis", () => {
  const mockClusterInstance = { once: jest.fn(), on: jest.fn() };
  const MockCluster = jest.fn(() => mockClusterInstance);
  return { Cluster: MockCluster };
});

// Reset module state between tests so the singleton is cleared
beforeEach(() => {
  jest.resetModules();
});

describe("redis", () => {
  it("getRedis() throws if called before initRedis()", async () => {
    const { getRedis: freshGetRedis } = await import("../src/db/redis");
    expect(() => freshGetRedis()).toThrow(
      "Redis has not been initialized. Call initRedis() first."
    );
  });

  it("getRedis() returns the same singleton instance on repeated calls after initRedis()", async () => {
    const { initRedis: freshInit, getRedis: freshGet } = await import(
      "../src/db/redis"
    );
    freshInit("localhost", 6379);
    const first = freshGet();
    const second = freshGet();
    expect(first).toBe(second);
  });
});

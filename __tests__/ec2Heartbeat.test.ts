jest.mock("../src/db/db", () => ({
  getDb: jest.fn(),
}));

import { getDb } from "../src/db/db";
import ec2Heartbeat from "../src/db/ec2Heartbeat";

const mockGetDb = getDb as jest.Mock;

function createMockBuilder(resolveValue?: unknown) {
  const builder: Record<string, jest.Mock> = {
    insert: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    del: jest.fn().mockResolvedValue(resolveValue),
    first: jest.fn().mockResolvedValue(resolveValue),
  };
  // Make builder awaitable for cases like `await db(table).insert(...)`
  (builder as Record<string, unknown>)["then"] = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve(resolveValue).then(resolve, reject);
  return builder;
}

describe("ec2Heartbeat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("beat()", () => {
    it("inserts a row with the correct instance_id", async () => {
      const builder = createMockBuilder(undefined);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      await ec2Heartbeat.beat("i-abc");

      expect(mockDb).toHaveBeenCalledWith("ec2_heartbeat");
      expect(builder.insert).toHaveBeenCalledWith({ instance_id: "i-abc" });
    });
  });

  describe("getLatest()", () => {
    it("returns the heartbeat_at string when a heartbeat exists", async () => {
      const builder = createMockBuilder({ heartbeat_at: "2024-01-01T00:00:00Z" });
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Heartbeat.getLatest("i-abc");

      expect(result).toBe("2024-01-01T00:00:00Z");
      expect(builder.where).toHaveBeenCalledWith({ instance_id: "i-abc" });
      expect(builder.orderBy).toHaveBeenCalledWith("heartbeat_at", "desc");
      expect(builder.first).toHaveBeenCalledWith("heartbeat_at");
    });

    it("returns null when no heartbeat exists for the instance", async () => {
      const builder = createMockBuilder(undefined);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Heartbeat.getLatest("i-xyz");

      expect(result).toBeNull();
    });
  });

  describe("deleteOlderThan()", () => {
    it("deletes rows older than the cutoff for the given instance", async () => {
      const cutoff = new Date("2024-01-01T00:00:00Z");
      const builder = createMockBuilder(3);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      await ec2Heartbeat.deleteOlderThan("i-abc", cutoff);

      expect(mockDb).toHaveBeenCalledWith("ec2_heartbeat");
      expect(builder.where).toHaveBeenCalledWith({ instance_id: "i-abc" });
      expect(builder.andWhere).toHaveBeenCalledWith(
        "heartbeat_at",
        "<",
        cutoff
      );
      expect(builder.del).toHaveBeenCalled();
    });
  });
});

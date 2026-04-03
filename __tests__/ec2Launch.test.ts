jest.mock("../src/db/db", () => ({
  getDb: jest.fn(),
}));

import { getDb } from "../src/db/db";
import ec2Launch from "../src/db/ec2Launch";

const mockGetDb = getDb as jest.Mock;

function createMockBuilder(resolveValue?: unknown) {
  const builder: Record<string, jest.Mock> = {
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(resolveValue),
    del: jest.fn().mockResolvedValue(resolveValue),
    first: jest.fn().mockResolvedValue(resolveValue),
  };
  // Make the builder itself awaitable so callers can `await db(table).select().orderBy()`
  (builder as Record<string, unknown>)["then"] = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve(resolveValue).then(resolve, reject);
  return builder;
}

describe("ec2Launch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("insert()", () => {
    it("calls the correct table with correct fields and returns the inserted row", async () => {
      const row = {
        id: 1,
        instance_id: "i-abc",
        public_ip: "1.2.3.4",
        private_ip: "10.0.0.1",
        is_leader: false,
      };
      const builder = createMockBuilder([row]);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Launch.insert("i-abc", "1.2.3.4", "10.0.0.1");

      expect(mockDb).toHaveBeenCalledWith("ec2_launch");
      expect(builder.insert).toHaveBeenCalledWith({
        instance_id: "i-abc",
        public_ip: "1.2.3.4",
        private_ip: "10.0.0.1",
      });
      expect(builder.returning).toHaveBeenCalledWith("*");
      expect(result).toEqual(row);
    });
  });

  describe("updateIsLeader()", () => {
    it("updates the correct row and returns the updated record", async () => {
      const row = { id: 1, instance_id: "i-abc", is_leader: true };
      const builder = createMockBuilder([row]);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Launch.updateIsLeader("i-abc", true);

      expect(builder.where).toHaveBeenCalledWith({ instance_id: "i-abc" });
      expect(builder.update).toHaveBeenCalledWith({ is_leader: true });
      expect(builder.returning).toHaveBeenCalledWith("*");
      expect(result).toEqual(row);
    });

    it("returns null when no row was updated", async () => {
      const builder = createMockBuilder([]);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Launch.updateIsLeader("i-nonexistent", false);

      expect(result).toBeNull();
    });
  });

  describe("getInstanceByInstanceId()", () => {
    it("returns the instance_id string when the instance exists", async () => {
      const builder = createMockBuilder({ instance_id: "i-abc" });
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Launch.getInstanceByInstanceId("i-abc");

      expect(result).toBe("i-abc");
      expect(builder.select).toHaveBeenCalledWith("instance_id");
      expect(builder.where).toHaveBeenCalledWith({ instance_id: "i-abc" });
    });

    it("returns null when the instance does not exist", async () => {
      const builder = createMockBuilder(undefined);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Launch.getInstanceByInstanceId("i-xyz");

      expect(result).toBeNull();
    });
  });

  describe("getOldestInstanceId()", () => {
    it("returns the oldest instance_id", async () => {
      const builder = createMockBuilder({ instance_id: "i-oldest" });
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Launch.getOldestInstanceId();

      expect(result).toBe("i-oldest");
      expect(builder.orderBy).toHaveBeenCalledWith("launched_at", "asc");
    });

    it("returns '-1' when the table is empty", async () => {
      const builder = createMockBuilder(undefined);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Launch.getOldestInstanceId();

      expect(result).toBe("-1");
    });
  });

  describe("getAll()", () => {
    it("returns rows ordered by launched_at desc", async () => {
      const rows = [
        { id: 2, instance_id: "i-newer" },
        { id: 1, instance_id: "i-older" },
      ];
      const builder = createMockBuilder(rows);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      const result = await ec2Launch.getAll();

      expect(result).toEqual(rows);
      expect(builder.select).toHaveBeenCalledWith("*");
      expect(builder.orderBy).toHaveBeenCalledWith("launched_at", "desc");
    });
  });

  describe("delete()", () => {
    it("deletes the correct row", async () => {
      const builder = createMockBuilder(1);
      const mockDb = jest.fn().mockReturnValue(builder);
      mockGetDb.mockReturnValue(mockDb);

      await ec2Launch.delete("i-abc");

      expect(builder.where).toHaveBeenCalledWith({ instance_id: "i-abc" });
      expect(builder.del).toHaveBeenCalled();
    });
  });
});

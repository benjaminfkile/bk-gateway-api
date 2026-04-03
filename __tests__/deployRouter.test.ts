//@ts-ignore
import request from "supertest";
import app from "../src/app";

const mockPublish = jest.fn().mockResolvedValue(1);
const mockGet = jest.fn().mockResolvedValue(null);

jest.mock("../src/db/redis", () => ({
  getRedis: jest.fn(() => ({
    publish: mockPublish,
    get: mockGet,
  })),
}));

jest.mock("../src/utils/verifyPassword", () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock("../src/services/leaderElectionService", () => ({
  __esModule: true,
  default: {
    aboutMe: {
      amILeader: false,
      myInstanceId: "i-123",
      publicIp: "1.2.3.4",
      privateIp: "10.0.0.1",
    },
  },
}));

jest.mock("node-fetch", () => {
  return jest.fn().mockImplementation(() => Promise.resolve({ status: 200 }));
});

describe("POST /api/deploy", () => {
  beforeAll(() => {
    app.set("secrets", { master_password_hash: "dummy" });
  });

  beforeEach(() => {
    mockPublish.mockClear();
    mockGet.mockClear();
  });

  it("returns 401 when x-bk-gateway-key header is missing", async () => {
    const res = await request(app).post("/api/deploy").send({ service: "portfolio-api", imageUri: "img:latest" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when service is missing", async () => {
    const res = await request(app)
      .post("/api/deploy")
      .set("x-bk-gateway-key", "test")
      .send({ imageUri: "img:latest" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when imageUri is missing", async () => {
    const res = await request(app)
      .post("/api/deploy")
      .set("x-bk-gateway-key", "test")
      .send({ service: "portfolio-api" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when service is not a known service", async () => {
    const res = await request(app)
      .post("/api/deploy")
      .set("x-bk-gateway-key", "test")
      .send({ service: "unknown-service", imageUri: "img:latest" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("publishes to Redis and returns 202 for a valid deploy request", async () => {
    const res = await request(app)
      .post("/api/deploy")
      .set("x-bk-gateway-key", "test")
      .send({ service: "portfolio-api", imageUri: "img:latest" });
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ queued: true, service: "portfolio-api", imageUri: "img:latest" });
    expect(mockPublish).toHaveBeenCalledWith(
      "deploy:portfolio-api",
      JSON.stringify({ service: "portfolio-api", imageUri: "img:latest" })
    );
  });
});

describe("GET /api/deploy/status", () => {
  beforeAll(() => {
    app.set("secrets", { master_password_hash: "dummy" });
  });

  it("returns 401 when x-bk-gateway-key header is missing", async () => {
    const res = await request(app).get("/api/deploy/status");
    expect(res.status).toBe(401);
  });

  it("returns an object keyed by service name", async () => {
    const res = await request(app)
      .get("/api/deploy/status")
      .set("x-bk-gateway-key", "test");
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    expect(res.body).not.toBeNull();
    // All values should be null (mocked redis.get returns null)
    for (const val of Object.values(res.body)) {
      expect(val).toBeNull();
    }
  });
});

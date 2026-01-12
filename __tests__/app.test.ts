//@ts-ignore
import request from "supertest";
import app from "../src/app";

jest.mock("node-fetch", () => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({ status: 200 })
  );
});

jest.mock("../src/utils/verifyPassword", () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock("../src/services/leaderElectionService", () => ({
  __esModule: true,
  default: { aboutMe: { amILeader: false, myInstanceId: "i-123", publicIp: "1.2.3.4", privateIp: "10.0.0.1" } },
}));

jest.mock("../src/db/ec2Launch", () => ({
  __esModule: true,
  default: { getAll: jest.fn().mockResolvedValue([{ id: 1, name: "test-instance" }]) },
}));

describe("bk-gateway-api basic routes", () => {
  // Ensure secrets are available for protectedRoute
  app.set("secrets", { master_password_hash: "dummy" });

  it("responds to GET /", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("/");
  });

  it("GET /api/health returns json with gateway status", async () => {
    const res = await request(app).get("/api/health");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("gateway");
    expect(res.body).toHaveProperty("services");
  });

  it("GET /api/about-me returns leader info", async () => {
    const res = await request(app)
      .get("/api/about-me")
      .set("x-bk-gateway-key", "test");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("amILeader");
  });

  it("GET /api/ec2-launch/instances returns array", async () => {
    const res = await request(app)
      .get("/api/ec2-launch/instances")
      .set("x-bk-gateway-key", "test");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

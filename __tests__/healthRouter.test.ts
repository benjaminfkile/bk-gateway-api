//@ts-ignore
import request from "supertest";
import app from "../src/app";
import fetch from "node-fetch";

jest.mock("node-fetch", () => jest.fn());

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

const mockFetch = fetch as unknown as jest.Mock;

describe("GET /api/health", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns 200 with all services up when all mocked services respond 200", async () => {
    mockFetch.mockResolvedValue({ status: 200 });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.gateway).toBe("up");
    expect(res.body).toHaveProperty("services");
    const services = res.body.services as Record<string, { status: string }>;
    Object.values(services).forEach((svc) => {
      expect(svc.status).toBe("up");
    });
  });

  it("returns 503 with service marked down when one service returns non-200", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("portfolio-api")) {
        return Promise.resolve({ status: 503 });
      }
      return Promise.resolve({ status: 200 });
    });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.gateway).toBe("degraded");
    expect(res.body.services["portfolio-api"].status).toBe("down");
    expect(res.body.services["portfolio-api"].httpStatus).toBe(503);
  });

  it("returns 503 with error timeout when a service throws an AbortError", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("wmsfo-api")) {
        return Promise.reject(abortError);
      }
      return Promise.resolve({ status: 200 });
    });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.services["wmsfo-api"]).toMatchObject({
      status: "down",
      error: "timeout",
    });
  });

  it("always includes the gateway field in the response body", async () => {
    mockFetch.mockResolvedValue({ status: 200 });
    const res = await request(app).get("/api/health");
    expect(res.body).toHaveProperty("gateway");
  });
});

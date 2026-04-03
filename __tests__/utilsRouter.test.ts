//@ts-ignore
import request from "supertest";
import app from "../src/app";

jest.mock("node-fetch", () =>
  jest.fn().mockResolvedValue({ status: 200 })
);

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

describe("POST /api/utils/hash-password", () => {
  it("returns 400 when no body is provided", async () => {
    const res = await request(app)
      .post("/api/utils/hash-password")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("returns 400 when password is an empty string", async () => {
    const res = await request(app)
      .post("/api/utils/hash-password")
      .send({ password: "" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("returns 200 with password and verifiable hash for a valid password", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bcrypt = require("bcrypt");
    const res = await request(app)
      .post("/api/utils/hash-password")
      .send({ password: "mysecret" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("password", "mysecret");
    expect(res.body).toHaveProperty("hash");
    const valid = await bcrypt.compare("mysecret", res.body.hash);
    expect(valid).toBe(true);
  });
});

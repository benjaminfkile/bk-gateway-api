//@ts-ignore
import request from "supertest";
import express from "express";
import protectedRoute from "../src/middleware/protectedRoute";

jest.mock("../src/utils/verifyPassword", () => ({
  verifyPassword: jest.fn(),
}));

import { verifyPassword } from "../src/utils/verifyPassword";

const mockVerify = verifyPassword as jest.Mock;

const FAKE_SECRETS = { master_password_hash: "$2b$10$fakehash" };

function makeTestApp(withSecrets = true) {
  const app = express();
  if (withSecrets) {
    app.set("secrets", FAKE_SECRETS);
  }
  app.get("/protected", protectedRoute(), (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe("protectedRoute middleware", () => {
  beforeEach(() => {
    mockVerify.mockReset();
  });

  it("returns 500 when secrets are not loaded on app", async () => {
    const app = makeTestApp(false);
    const res = await request(app)
      .get("/protected")
      .set("x-bk-gateway-key", "any");
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 401 when x-bk-gateway-key header is missing", async () => {
    const app = makeTestApp();
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 403 when password does not match the hash", async () => {
    mockVerify.mockResolvedValue(false);
    const app = makeTestApp();
    const res = await request(app)
      .get("/protected")
      .set("x-bk-gateway-key", "wrongpassword");
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("calls next() and returns 200 when password is valid", async () => {
    mockVerify.mockResolvedValue(true);
    const app = makeTestApp();
    const res = await request(app)
      .get("/protected")
      .set("x-bk-gateway-key", "correctpassword");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

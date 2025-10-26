import express, { Request, Response } from "express";
import fetch from "node-fetch";
import { serviceMap } from "../config/serviceMap";

const healthRouter = express.Router();

healthRouter.route("/").get(async (req: Request, res: Response) => {
  const results: Record<string, any> = {};

  // Only check APIs that are marked for health inclusion
  const servicesToCheck = Object.entries(serviceMap).filter(
    ([, svc]) => svc.includeInHealthCheck
  );

  const checks = servicesToCheck.map(async ([name, { url }]) => {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    console.log(name)

    try {
      const target =
        process.env.IS_LOCAL === "true"
          ? `${url}/api/health` // local dev → direct to port
          : `http://localhost/${name}/api/health`; // AWS → through proxy

      const response = await fetch(target, { signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      const duration = Date.now() - start;

      results[name] = {
        status: response.ok ? "up" : "down",
        responseTimeMs: duration,
        ...(data || {}),
      };
    } catch (err: any) {
      results[name] = {
        status: "down",
        error:
          err.name === "AbortError"
            ? "timeout"
            : err.message || "connection failed",
      };
    } finally {
      clearTimeout(timeout);
    }
  });

  await Promise.all(checks);

  const anyDown = Object.values(results).some(
    (svc: any) => svc.status === "down"
  );

  const statusCode = anyDown ? 503 : 200;

  res.status(statusCode).json({
    gateway: anyDown ? "degraded" : "up",
    timestamp: new Date().toISOString(),
    services: results,
  });
});

export default healthRouter;

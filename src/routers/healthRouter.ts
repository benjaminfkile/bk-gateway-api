import express, { Request, Response } from "express";
import fetch from "node-fetch";
import { serviceMap } from "../config/serviceMap";

const healthRouter = express.Router();

healthRouter.route("/").get(async (req: Request, res: Response) => {
  const results: Record<string, any> = {};

  // Only check APIs marked for inclusion
  const servicesToCheck = Object.entries(serviceMap).filter(
    ([, svc]) => svc.includeInHealthCheck
  );

  const checks = servicesToCheck.map(async ([name, { url }]) => {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // faster timeout

    try {
      const response = await fetch(`${url}/api/health`, {
        method: "GET",
        signal: controller.signal,
      });

      const duration = Date.now() - start;

      results[name] = {
        status: response.status === 200 ? "up" : "down",
        httpStatus: response.status,
        responseTimeMs: duration,
      };
    } catch (err: any) {
      results[name] = {
        status: "down",
        error:
          err.name === "AbortError" ? "timeout" : err.message || "failed",
      };
    } finally {
      clearTimeout(timeout);
    }
  });

  await Promise.all(checks);

  const anyDown = Object.values(results).some(
    (svc: any) => svc.status === "down"
  );

  res.status(anyDown ? 503 : 200).json({
    gateway: anyDown ? "degraded" : "up",
    timestamp: new Date().toISOString(),
    services: results,
  });
});

export default healthRouter;

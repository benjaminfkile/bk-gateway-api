import express, { Request, Response } from "express";
import { getRedis } from "../db/redis";
import { serviceMap } from "../config/serviceMap";

const deployRouter = express.Router();

deployRouter.use(express.json());

deployRouter.post("/", async (req: Request, res: Response) => {
  const { service, imageUri } = req.body ?? {};

  if (!service) {
    return res.status(400).json({ error: "Missing required field: service" });
  }

  if (!imageUri) {
    return res.status(400).json({ error: "Missing required field: imageUri" });
  }

  const knownServices = Object.keys(serviceMap);
  if (!knownServices.includes(service)) {
    return res.status(400).json({ error: `Unknown service: ${service}` });
  }

  try {
    const redis = getRedis();
    await redis.publish(`deploy:${service}`, JSON.stringify({ service, imageUri }));
    return res.status(202).json({ queued: true, service, imageUri });
  } catch (err) {
    console.error("[DeployRouter] Error publishing deploy:", err);
    return res.status(500).json({ error: "Failed to queue deploy" });
  }
});

deployRouter.get("/status", async (_req: Request, res: Response) => {
  try {
    const redis = getRedis();
    const services = Object.keys(serviceMap);

    const statusEntries = await Promise.all(
      services.map(async (service) => {
        const raw = await redis.get(`deploy:status:${service}`);
        const value = raw ? JSON.parse(raw) : null;
        return [service, value] as [string, unknown];
      })
    );

    return res.json(Object.fromEntries(statusEntries));
  } catch (err) {
    console.error("[DeployRouter] Error fetching deploy status:", err);
    return res.status(500).json({ error: "Failed to fetch deploy status" });
  }
});

export default deployRouter;

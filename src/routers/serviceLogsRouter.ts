import express, { Request, Response } from "express";
import serviceLogs from "../db/serviceLogs";
import { LogLevel } from "../types";
import { log } from "../utils/logger";

const router = express.Router();

/**
 * GET /api/logs
 * Optional query params:
 *  - service_id (number)
 *  - instance_id (string)
 *  - level ("debug" | "info" | "warning" | "error")
 *  - limit (number, default 100)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { service_id, instance_id, level, limit } = req.query;

    const logs = await serviceLogs.getLogs({
      service_id: service_id ? Number(service_id) : undefined,
      instance_id: instance_id as string | undefined,
      level: level as LogLevel | undefined,
      limit: limit ? Number(limit) : 100,
    });

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    const msg = `GET /api/logs failed: ${err}`;
    log("error", msg);
    console.error(msg);
    res.status(500).json({ success: false, error: "Failed to fetch logs" });
  }
});

/**
 * POST /api/logs
 * Body:
 *  - service_id (number)
 *  - instance_id (string)
 *  - level ("debug" | "info" | "warning" | "error")
 *  - message (string)
 *  - meta (object, optional)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { service_id, instance_id, level, message, meta } = req.body;

    if (!service_id || !instance_id || !level || !message) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const log = await serviceLogs.insert(
      Number(service_id),
      instance_id,
      level,
      message,
      meta
    );

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    const msg = `POST /api/logs failed: ${err}`;
    log("error", msg);
    console.error(msg);
    res.status(500).json({ success: false, error: "Failed to insert log" });
  }
});

/**
 * DELETE /api/logs
 * Optional query params:
 *  - service_id (number)
 *  - instance_id (string)
 */
router.delete("/", async (req: Request, res: Response) => {
  try {
    const { service_id, instance_id } = req.query;

    if (!service_id && !instance_id) {
      return res.status(400).json({
        success: false,
        error: "Must provide either service_id or instance_id",
      });
    }

    const deletedCount = await serviceLogs.delete({
      service_id: service_id ? Number(service_id) : undefined,
      instance_id: instance_id as string | undefined,
    });

    res.json({ success: true, deleted: deletedCount });
  } catch (err) {
    const msg = `DELETE /api/logs failed: ${err})`;
    log("error", msg);
    console.error(msg);

    res.status(500).json({ success: false, error: "Failed to delete logs" });
  }
});

/**
 * GET /api/logs/count
 * Optional query param:
 *  - service_id (number)
 */
router.get("/count", async (req: Request, res: Response) => {
  try {
    const { service_id } = req.query;
    const count = await serviceLogs.getCount(
      service_id ? Number(service_id) : undefined
    );

    res.json({ success: true, count });
  } catch (err) {
    const msg = `GET /api/logs/count failed: ${err})`;
    log("error", msg);
    console.error(msg);
    res.status(500).json({ success: false, error: "Failed to get log count" });
  }
});

export default router;

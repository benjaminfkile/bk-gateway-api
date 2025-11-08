import express, { Request, Response } from "express";
import serviceLogSettings from "../db/serviceLogSettings";

const router = express.Router();

router.get("/:service_id", async (req: Request, res: Response) => {
  const { service_id } = req.params;
  const settings = await serviceLogSettings.getByServiceId(Number(service_id));
  res.json(
    settings ?? {
      service_id: Number(service_id),
      enabled: true,
      min_level: "debug",
    }
  );
});

router.post("/:service_id", async (req: Request, res: Response) => {
  const { service_id } = req.params;
  const { enabled, min_level } = req.body;
  const updated = await serviceLogSettings.upsert(
    Number(service_id),
    enabled,
    min_level
  );
  res.json(updated);
});

export default router;

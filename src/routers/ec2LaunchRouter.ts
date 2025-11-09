import express, { Request, Response } from "express";
import ec2Launch from "../db/ec2Launch";

const ec2LaunchRouter = express.Router();


ec2LaunchRouter.get("/instances", async (req: Request, res: Response) => {
  try {
    const rows = await ec2Launch.getAll();
    res.json(rows);
  } catch (error) {
    console.error("[GET /api/ec2-launch] Error:", error);
    res.status(500).json({ error: "Failed to fetch EC2 launch records." });
  }
});

export default ec2LaunchRouter;

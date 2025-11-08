import { Router } from "express";
import leaderElectionService from "../services/leaderElectionService";

const leaderRouter = Router();

leaderRouter.get("/", async (req, res) => {
  try {
    const result = await leaderElectionService.getState();
    res.json(result);
  } catch (err) {
    console.error("[LeaderRouter] Error:", err);
    res.status(500).json({ error: "Failed to determine leader status" });
  }
});

export default leaderRouter;

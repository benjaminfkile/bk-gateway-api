import { Router } from "express";
import { amILeader } from "../utils/amILeader";
import instanceService from "../services/instanceService";

const leaderRouter = Router();

leaderRouter.get("/", async (req, res) => {
  try {
    const instanceId = await instanceService.getId();
    const result = await amILeader(instanceId);
    res.json(result);
  } catch (err) {
    console.error("[LeaderRouter] Error:", err);
    res.status(500).json({ error: "Failed to determine leader status" });
  }
});

export default leaderRouter;

import { Router } from "express";
import leaderElectionService from "../services/leaderElectionService";

const leaderRouter = Router();

leaderRouter.get("/", async (req, res) => {
  try {
    const { amILeader, myInstanceId, myIp } = leaderElectionService.aboutMe
    res.json({amILeader: amILeader, myInstanceId: myInstanceId, myIp: myIp});
  } catch (err) {
    console.error("[LeaderRouter] Error:", err);
    res.status(500).json({ error: "Failed to determine leader status" });
  }
});

export default leaderRouter;

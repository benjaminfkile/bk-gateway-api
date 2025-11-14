import { Request, Response, NextFunction } from "express";
import { verifyPassword } from "../utils/verifyPassword";
import { IAPISecrets } from "../interfaces";

const protectedRoute = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const secrets = req.app.get("secrets") as IAPISecrets;
      if (!secrets) {
        return res.status(500).json({ error: "Secrets not loaded" });
      }

      const headerPassword = req.headers["x-bk-gateway-key"];
      if (!headerPassword || typeof headerPassword !== "string") {
        return res.status(401).json({ error: "Missing x-bk-gateway-key header" });
      }

      const isValid = await verifyPassword(
        headerPassword,
        secrets.master_password_hash
      );

      if (!isValid) {
        return res.status(403).json({ error: "Invalid credentials" });
      }

      next();
    } catch (err) {
      console.error("[protectedRoute] Error:", err);
      return res.status(500).json({ error: "Internal auth error" });
    }
  };
};

export default protectedRoute;

import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";

const utilsRouter = express.Router();
const jsonParser = express.json();

// POST /api/utils/hash-password
utilsRouter.post(
  "/hash-password",
  jsonParser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password } = req.body as { password?: string };

      if (!password) {
        return res.status(400).json({ message: "Missing password" });
      }

      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);

      return res.status(200).json({
        password,
        hash,
      });
    } catch (err) {
      console.error("[hash-password] Error:", err);
      next(err);
    }
  }
);

export default utilsRouter;

import { Router, Request, Response } from "express"
import axios from "axios"

const router = Router()

// Decide base URL from env (set inside Docker) or fallback to localhost
const NOTECARDS_API_BASE =
  process.env.NOTECARDS_BASE || "http://localhost:3001"

// Proxy all requests under /notecards-api/*
router.use("/", async (req: Request, res: Response) => {
  try {
    // Strip "/notecards-api" from the front of the URL before forwarding
    const forwardPath = req.originalUrl.replace(/^\/notecards-api/, "")
    const url = `${NOTECARDS_API_BASE}${forwardPath}`

    const response = await axios({
      method: req.method as any,
      url,
      data: req.body,
      headers: { ...req.headers, host: undefined } // avoid forwarding Host header
    })

    res.status(response.status).send(response.data)
  } catch (err: any) {
    console.error("Error proxying to notecards-api:", err.message)
    res.status(500).json({ error: "Gateway error" })
  }
})

export default router

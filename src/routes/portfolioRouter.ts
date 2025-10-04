import { Router, Request, Response } from "express"
import axios from "axios"

const router = Router()

const PORTFOLIO_API_BASE =
  process.env.PORTFOLIO_BASE || "http://localhost:3002"

router.use("/", async (req: Request, res: Response) => {
  try {
    const forwardPath = req.originalUrl.replace(/^\/portfolio-api/, "")
    const url = `${PORTFOLIO_API_BASE}${forwardPath}`

    const response = await axios({
      method: req.method as any,
      url,
      data: req.body,
      headers: { ...req.headers, host: undefined },
      validateStatus: (status) => status < 500 // accept 304, 404, etc
    })

    res.status(response.status).send(response.data)
  } catch (err: any) {
    console.error("Error proxying to portfolio-api:", err.message)
    res.status(500).json({ error: "Gateway error" })
  }
})

export default router

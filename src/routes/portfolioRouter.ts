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
      responseType: "stream", // always stream to keep binary safe
      validateStatus: (status) => status < 500
    })

    const contentType = response.headers["content-type"] || ""

    if (contentType.startsWith("application/json") || contentType.startsWith("text/")) {
      // For JSON or text: buffer the stream, then send as JSON/text
      let raw = ""
      response.data.setEncoding("utf8")
      response.data.on("data", (chunk: string) => {
        raw += chunk
      })
      response.data.on("end", () => {
        try {
          if (contentType.startsWith("application/json")) {
            res.status(response.status).json(JSON.parse(raw))
          } else {
            res.status(response.status).send(raw)
          }
        } catch (err) {
          res.status(500).json({ error: "Error parsing upstream response" })
        }
      })
    } else {
      // For media/binary: copy headers and pipe through
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value !== undefined) res.setHeader(key, value as string)
      })
      res.status(response.status)
      response.data.pipe(res)
    }
  } catch (err: any) {
    console.error("Error proxying to portfolio-api:", err.message)
    res.status(500).json({ error: "Gateway error" })
  }
})

export default router

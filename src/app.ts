import express, { Express, NextFunction, Request, Response } from "express"
import morgan from "morgan"
import cors from "cors"
//import helmet from "helmet"
import os from "os"
import notecardsRouter from "./routes/notecardsRouter"
import portfolioRouter from "./routes/portfolioRouter"

const NODE_ENV = process.env.NODE_ENV
const app: Express = express()

// Type declaration for morgan options
const morganOption: string = (NODE_ENV === "production") ? "tiny" : "common"

// Middleware
app.use(morgan(morganOption)) // Type declaration for morgan
app.use(cors())
//app.use(helmet())
app.use(express.json())

// Routes
app.get("/", (req: Request, res: Response) => {
  res.send("/")
})

app.get("/health", (req, res) => res.status(200).send("ok"))

app.get("/gateway-info", (req: Request, res: Response) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime()
  })
})

app.use("/portfolio-api", portfolioRouter)

app.use("/notecards-api", notecardsRouter)

// Catch uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1); // Exit the process with a non-zero status code
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection:', reason);
  // You might want to handle promise rejections here or log them for analysis
});

// Error handling middleware
app.use(function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err)
  }
  const customErr = err as { status?: number, message?: string }
  const status = customErr.status || 500
  const message = customErr.message || "Internal Server Error"
  res.status(status).json({ error: message })
})


export default app

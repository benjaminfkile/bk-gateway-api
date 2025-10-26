import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import os from "os";

const app = express();

const NODE_ENV = process.env.NODE_ENV;
const morganOption = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganOption));
app.use(cors());
app.use(express.json());
app.use(helmet());

app.get("/", (req, res) => res.send("/"));

app.get("/health", (req, res) => res.status(200).send("ok"));

app.get("/gateway-info", (req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime(),
  });
});

// API maps
const API_MAP: Record<string, string> = {
  "/portfolio-api": process.env.PORTFOLIO_BASE || "http://localhost:3001",
  "/bengrok-tunnel": process.env.BENGROK_BASE || "http://localhost:3002",
  "/wmsfo-api": process.env.BENGROK_BASE || "http://localhost:3002",
};

// Proxies
for (const [prefix, target] of Object.entries(API_MAP)) {
  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathRewrite: (path) => path.replace(prefix, ""),
      proxyTimeout: 60000,
    })
  );
}

export default app;//bump

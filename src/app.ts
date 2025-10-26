import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import os from "os";
import { serviceMap } from "./config/serviceMap";
import healthRouter from "./routers/healthRouter";

const app = express();

const NODE_ENV = process.env.NODE_ENV;
const morganOption = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganOption));
app.use(cors());
app.use(express.json());
app.use(helmet());

app.get("/", (req, res) => res.send("/"));

app.use("/api/health", healthRouter);

app.get("/api/gateway-info", (req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime(),
  });
});

// Proxies
for (const [name, { url }] of Object.entries(serviceMap)) {
  app.use(
    `/${name}`,
    createProxyMiddleware({
      target: url,
      changeOrigin: true,
      ws: true,
      pathRewrite: (path) => path.replace(new RegExp(`^/${name}`), ""),
      proxyTimeout: 60000,
    })
  );
}

export default app;

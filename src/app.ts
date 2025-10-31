import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import os from "os";
import { serviceMap } from "./config/serviceMap";
import healthRouter from "./routers/healthRouter";

const app = express();

const NODE_ENV = process.env.NODE_ENV;
const morganOption = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganOption));
app.use(cors());
app.use(helmet());

// Don't parse JSON before proxy
// app.use(express.json());

app.get("/", (req, res) => res.send("/"));
app.use("/api/health", healthRouter);

app.get("/api/gateway-info", (req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime(),
  });
});

// Proxy setup (TypeScript-safe)
for (const [name, { url }] of Object.entries(serviceMap)) {
  const proxyConfig: Options = {
    target: url,
    changeOrigin: true,
    ws: true,
    pathRewrite: (path) => path.replace(new RegExp(`^/${name}`), ""),
    proxyTimeout: 60000,

    // The real fix for POST/PUT/DELETE with JSON
    //@ts-ignore
    onProxyReq: (proxyReq, req, _res) => {
      if (
        req.method === "POST" ||
        req.method === "PUT" ||
        req.method === "PATCH"
      ) {
        if (req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader("Content-Type", "application/json");
          proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      }
    },
  };

  app.use(`/${name}`, createProxyMiddleware(proxyConfig));
}

// Now parse JSON for local routes
app.use(express.json());

export default app;

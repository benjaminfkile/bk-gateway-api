// src/app.ts
import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import https from "https";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import os from "os";
import { serviceMap } from "./config/serviceMap";
import { isLocal } from "./utils/isLocal";
import healthRouter from "./routers/healthRouter";
import aboutMeRouter from "./routers/aboutMeRouter";
import ec2LaunchRouter from "./routers/ec2LaunchRouter";
import utilsRouter from "./routers/utilsRouter";
import protectedRoute from "./middleware/protectedRoute";

const app = express();

// Lightweight console logging only in local
if (isLocal()) app.use(morgan("tiny"));

// Minimal security headers
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());

// Don't use express.json() before proxy; only after
// proxies to avoid reading + buffering every body.

app.get("/", (_req, res) => res.send("/"));
app.use("/api/health", healthRouter);
app.use("/api/about-me", protectedRoute(), aboutMeRouter);
app.use("/api/ec2-launch", protectedRoute(), ec2LaunchRouter);
app.use("/api/utils", utilsRouter);

app.get("/api/gateway-info", (_req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime(),
  });
});

// Keep-alive agents reused by all proxies
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 1000 });

// Create proxies for all microservices
for (const [name, { url }] of Object.entries(serviceMap)) {
  const proxyConfig: Options = {
    target: url,
    changeOrigin: true,
    ws: true,
    agent: url.startsWith("https") ? httpsAgent : httpAgent,
    proxyTimeout: 60000,
    timeout: 60000,
    //@ts-ignore
    compress: false, // Disable re-compression
    //@ts-ignore
    onProxyReq: (proxyReq, req, _res) => {
      // Avoid unnecessary buffering for GET/HEAD
      if (
        req.method === "POST" ||
        req.method === "PUT" ||
        req.method === "PATCH"
      ) {
        if (req.body && Object.keys(req.body).length) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader("Content-Type", "application/json");
          proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      }
    },
    pathRewrite: (path) => path.replace(new RegExp(`^/${name}`), ""),
    logLevel: isLocal() ? "debug" : "warn",
  };

  app.use(`/${name}`, createProxyMiddleware(proxyConfig));
}

// Parse JSON only for non-proxied local routes
app.use(express.json());

export default app;

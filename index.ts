import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { initDb } from "./src/db/db";
import { initRedis } from "./src/db/redis";
import app, { wsProxies } from "./src/app";
import { getAppSecrets } from "./src/aws/getAppSecrets";
import { getDBSecrets } from "./src/aws/getDBSecrets";
import { IAPISecrets } from "./src/interfaces";
import { TNodeEnviromnent } from "./src/types";
import { isLocal } from "./src/utils/isLocal";
import instanceMetadataService from "./src/services/instanceMetadataService";
import leaderElectionService from "./src/services/leaderElectionService";
import deploySubscriberService from "./src/services/deploySubscriberService";

const port = parseInt(process.env.PORT ?? "3000");

process.on("uncaughtException", (err) => {
  const msg = `[Fatal Error", ${err}`;
  console.error(msg);
  console.log("Node NOT Exiting...");
});

async function startGateway() {
  try {
    // --- Load Secrets ---
    const dbSecrets = await getDBSecrets();
    const appSecrets: IAPISecrets = await getAppSecrets();
    app.set("secrets", appSecrets);
    // --- Determine Environment ---
    const environment: TNodeEnviromnent = isLocal()
      ? "local"
      : (appSecrets.node_env as TNodeEnviromnent) || "local";
    app.set("environment", environment);

    const redisPort = Number(appSecrets.redis_port);
    if (isNaN(redisPort)) {
      throw new Error(
        `[Gateway] Invalid redis_port value: "${appSecrets.redis_port}"`,
      );
    }
    initRedis(appSecrets.redis_host, redisPort);

    await initDb(dbSecrets, appSecrets);

    await instanceMetadataService.init();
    const { instanceId, publicIp, privateIp } = instanceMetadataService;
    if (instanceId && publicIp && privateIp) {
      await leaderElectionService.init(instanceId, publicIp, privateIp);
      deploySubscriberService.init(
        appSecrets.redis_host,
        Number(appSecrets.redis_port),
        instanceId,
      );
    } else {
      //!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      console.error("leaderElectionService init in index.ts if broken");
    }

    const server = http.createServer(app);

    // Register WebSocket upgrade handler with path-based dispatch
    const sortedProxyEntries = Object.entries(wsProxies).sort(([a], [b]) => {
      const baseA = a.replace(/-dev$/, "");
      const baseB = b.replace(/-dev$/, "");
      const baseCmp = baseA.localeCompare(baseB);
      if (baseCmp !== 0) return baseCmp;
      return b.length - a.length;
    });

    server.on("upgrade", (req, socket, head) => {
      for (const [name, proxy] of sortedProxyEntries) {
        if (req.url?.startsWith(`/${name}`)) {
          proxy.upgrade(req, socket, head);
          return;
        }
      }
      socket.destroy();
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`[Gateway] Listening on port ${port} [env=${environment}]`);
    });

    // --- Graceful Shutdown ---
    const shutdown = async () => {
      console.log("[Gateway] Shutting down gracefully...");

      try {
        //await ec2LaunchService.stopInstance(uniqueId);
      } catch (err) {
        const msg = `[Gateway] Error cleaning up EC2 instance: ${err}`;
        console.error(msg);
      }

      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    const msg = `[Gateway] Fatal startup error: ${err}`;
    console.error(msg);
    process.exit(1);
  }
}

// --- Entrypoint ---
startGateway();

import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { initDb } from "./src/db/db";
import app from "./src/app";
import { getAppSecrets } from "./src/aws/getAppSecrets";
import { getDBSecrets } from "./src/aws/getDBSecrets";
import { IAPISecrets } from "./src/interfaces";
import { TNodeEnviromnent } from "./src/types";
import { isLocal } from "./src/utils/isLocal";
import instanceMetadataService from "./src/services/instanceMetadataService";
import leaderElectionService from "./src/services/leaderElectionService";

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

    await initDb(dbSecrets, appSecrets, environment);

    await instanceMetadataService.init(environment);
    const { instanceId, privateIp } = instanceMetadataService;
    if (instanceId && privateIp) {
      await leaderElectionService.init(instanceId, privateIp);
    } else {
      //!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    }

    const server = http.createServer(app);
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

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
import ec2LaunchService from "./src/services/ec2LaunchService";
import ec2CleanupService from "./src/services/ec2CleanupService";
import instanceService from "./src/services/instanceService";

const port = parseInt(process.env.PORT ?? "3000");

process.on("uncaughtException", (err) => {
  console.error("[Fatal Error]", err);
  console.log("Node NOT Exiting...");
});

async function startGateway() {
  console.log("[Gateway] Starting single-instance mode...");

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

    // --- Initialize Database ---
    await initDb(dbSecrets, appSecrets, environment);
    console.log("[Gateway] Database initialized");

    // --- Initialize Instance Info ---
    await instanceService.init(environment);
    const uniqueId = instanceService.getUniqueId();
    console.log(`[Gateway] Instance initialized as ${uniqueId}`);

    // --- Start EC2 tracking & leader election ---
    const { isLeader, leaderId } = await ec2LaunchService.startInstance(uniqueId);
    console.log(
      `[Gateway] Instance ${uniqueId} registered. Leader: ${leaderId} (isLeader=${isLeader})`
    );

    // --- Start Cleanup Loop ---
    ec2CleanupService.start(uniqueId);

    // --- Start HTTP Server ---
    const server = http.createServer(app);
    server.listen(port, "0.0.0.0", () => {
      console.log(`[Gateway] Listening on port ${port} [env=${environment}]`);
    });

    // --- Graceful Shutdown ---
    const shutdown = async () => {
      console.log("[Gateway] Shutting down gracefully...");
      ec2CleanupService.stop();

      try {
        await ec2LaunchService.stopInstance(uniqueId);
      } catch (err) {
        console.error("[Gateway] Error cleaning up EC2 instance:", err);
      }

      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error("[Gateway] Fatal startup error:", err);
    process.exit(1);
  }
}

// --- Entrypoint ---
startGateway();

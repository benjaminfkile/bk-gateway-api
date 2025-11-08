import dotenv from "dotenv";
dotenv.config();
import cluster from "cluster";
import os from "os";
import http from "http";
import { initDb } from "./src/db/db";
import app from "./src/app";
import { getAppSecrets } from "./src/aws/getAppSecrets";
import { getDBSecrets } from "./src/aws/getDBSecrets";
import { IAPISecrets, IInstanceMessage } from "./src/interfaces";
import { TNodeEnviromnent } from "./src/types";
import { isLocal } from "./src/utils/isLocal";
import ec2LaunchService from "./src/services/ec2LaunchService";
import ec2CleanupService from "./src/services/ec2CleanupService";
import instanceService from "./src/services/instanceService";

const port = parseInt(process.env.PORT ?? "3000");

process.on("uncaughtException", (err) => {
  console.error(err);
  console.log("Node NOT Exiting...");
});

async function startPrimary() {
  console.log("[Gateway] Primary process starting...");

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

    // --- Initialize DB ---
    await initDb(dbSecrets, appSecrets, environment);

    // --- Initialize Instance Info ---
    await instanceService.init(environment);
    const uniqueId = instanceService.getUniqueId();

    console.log(`[Gateway] Instance initialized as ${uniqueId}`);

    // --- Start EC2 tracking ---
    await ec2LaunchService.startInstance(uniqueId);
    ec2CleanupService.start(uniqueId);

    // --- Fork Workers ---
    const cpuCount = os.cpus().length;
    console.log(`[Gateway] Forking ${cpuCount} workers...`);
    for (let i = 0; i < cpuCount; i++) cluster.fork();

    // --- Restart Dead Workers ---
    cluster.on("exit", (worker) => {
      console.log(
        `[Gateway] Worker ${worker.process.pid} died — restarting...`
      );
      cluster.fork();
    });

    // --- Provide Instance ID to Workers ---
    cluster.on("message", async (worker, msg) => {
      if (msg.type === "GET_INSTANCE_ID") {
        worker.send({
          type: "INSTANCE_ID",
          data: { id: instanceService.getUniqueId(), env: environment },
        });
      }
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

async function startWorker() {
  try {
    const { id, env } = await new Promise<{
      id: string;
      env: TNodeEnviromnent;
    }>((resolve) => {
      process.send?.({ type: "GET_INSTANCE_ID" });

      process.on("message", (msg: unknown) => {
        if (
          typeof msg === "object" &&
          msg !== null &&
          "type" in msg &&
          (msg as IInstanceMessage).type === "INSTANCE_ID"
        ) {
          resolve(
            //@ts-ignore
            (msg as IInstanceMessage).data as {
              id: string;
              env: TNodeEnviromnent;
            }
          );
        }
      });
    });

    // --- hydrate instanceService ---
    await instanceService.setFromParent(id, env);

    // --- initialize DB for this worker ---
    const dbSecrets = await getDBSecrets();
    const appSecrets: IAPISecrets = await getAppSecrets();
    await initDb(dbSecrets, appSecrets, env);

    // console.log(
    //   `[Gateway Worker ${process.pid}] DB initialized, using instanceId ${id}`
    // );

    const server = http.createServer(app);
    server.listen(port, "0.0.0.0", () => {
      console.log(
        `[Gateway Worker ${process.pid}] Listening on port ${port} [env=${env}]`
      );
    });
  } catch (err) {
    console.error(`[Worker ${process.pid}] Failed to start:`, err);
    process.exit(1);
  }
}

// --- Entrypoint ---
if (cluster.isPrimary) {
  startPrimary();
} else {
  startWorker();
}

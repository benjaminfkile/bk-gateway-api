import dotenv from "dotenv";
dotenv.config();
import cluster from "cluster";
import os from "os";
import app from "./src/app";

const port = parseInt(process.env.PORT ?? "3000");

if (cluster.isPrimary) {
  const cpuCount = os.cpus().length;
  console.log(`Primary running, forking ${cpuCount} workers...`);
  for (let i = 0; i < cpuCount; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died — restarting...`);
    cluster.fork();
  });
} else {
  
  app.listen(port, "0.0.0.0", () => {
    console.log(`Gateway worker ${process.pid} on port ${port}`);
  });
}
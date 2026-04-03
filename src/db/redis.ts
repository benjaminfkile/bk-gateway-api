import { Cluster } from "ioredis";

let redisClient: Cluster | null = null;

export function initRedis(host: string, port: number): void {
  if (redisClient) return;

  redisClient = new Cluster([{ host, port }], {
    redisOptions: { tls: {} },
  });

  redisClient.once("connect", () => {
    console.log("[Redis] Connected");
  });

  redisClient.on("error", (err) => {
    console.error("[Redis] Error:", err);
  });
}

export function getRedis(): Cluster {
  if (!redisClient) {
    throw new Error("Redis has not been initialized. Call initRedis() first.");
  }
  return redisClient;
}

import Dockerode from "dockerode";
import { getRedis } from "../db/redis";
import { IDeployResult } from "../interfaces";

const docker = new Dockerode({ socketPath: "/var/run/docker.sock" });

export async function handleDeploy(
  service: string,
  imageUri: string,
  instanceId: string
): Promise<void> {
  const redis = getRedis();

  // Self-deploy: delegate to watchdog sidecar
  if (service === "bk-gateway-api") {
    await redis.publish("deploy:gateway-self", JSON.stringify({ service, imageUri, instanceId }));
    return;
  }

  const lockKey = `deploy:${service}:lock`;

  // Acquire distributed lock
  const acquired = await redis.set(lockKey, instanceId, "EX", 120, "NX");
  if (!acquired) {
    console.log(`[DeployService] Lock for ${service} already held. Skipping.`);
    return;
  }

  const result: IDeployResult = { service, imageUri, success: true };

  try {
    // Pull image
    await new Promise<void>((resolve, reject) => {
      docker.pull(imageUri, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (followErr: Error | null) => {
          if (followErr) return reject(followErr);
          resolve();
        });
      });
    });

    // Stop and restart the container
    const containers = await docker.listContainers({ all: true, filters: { name: [service] } });
    const containerInfo = containers.find((c) => c.Names.some((n) => n === `/${service}` || n === service));
    if (!containerInfo) {
      throw new Error(`Container not found: ${service}`);
    }
    const container = docker.getContainer(containerInfo.Id);
    await container.stop();
    await container.start();
  } catch (err: any) {
    result.success = false;
    result.error = err?.message ?? String(err);
  } finally {
    // Publish result and set status key
    const payload = JSON.stringify(result);
    await redis.publish(`deploy:result:${instanceId}`, payload);
    await redis.set(`deploy:status:${service}`, payload);

    // Release lock
    await redis.del(lockKey);
  }
}

import { Cluster } from "ioredis";
import * as deployService from "./deployService";
import { IDeployMessage } from "../interfaces";

const deploySubscriberService = {
  init(host: string, port: number, instanceId: string): void {
    const subscriber = new Cluster([{ host, port }], {
      redisOptions: { tls: {} },
    });

    subscriber.once("connect", () => {
      console.log("[DeploySubscriberService] Connected");
    });

    subscriber.on("error", (err) => {
      console.error("[DeploySubscriberService] Error:", err);
    });

    subscriber.psubscribe("deploy:*", (err) => {
      if (err) {
        console.error("[DeploySubscriberService] psubscribe error:", err);
      }
    });

    subscriber.on("pmessage", (_pattern: string, channel: string, message: string) => {
      if (channel.startsWith("deploy:result:") || channel === "deploy:gateway-self") {
        return;
      }

      console.log(`[DeploySubscriberService] Received deploy command on channel: ${channel}`);

      let payload: IDeployMessage;
      try {
        payload = JSON.parse(message);
      } catch (err) {
        console.error(`[DeploySubscriberService] Failed to parse message on channel ${channel}:`, err);
        return;
      }

      const { service, imageUri } = payload;

      deployService
        .handleDeploy(service, imageUri, instanceId)
        .then(() => {
          console.log(`[DeploySubscriberService] handleDeploy completed for service: ${service}`);
        })
        .catch((err) => {
          console.error(`[DeploySubscriberService] handleDeploy failed for service: ${service}:`, err);
        });
    });
  },
};

export default deploySubscriberService;

import os from "os";
import crypto from "crypto";
import { isLocal } from "../utils/isLocal";

const METADATA_BASE_URL = "http://169.254.169.254/latest";

const instanceMetadataService = {
  instanceId: null as string | null,
  privateIp: null as string | null,
  environment: "local" as string,

  async init(env: string) {
    if (this.instanceId && this.privateIp) return; // already initialized

    this.environment = env;

    const { instanceId, privateIp } = await this.getMetadata();
    this.instanceId = instanceId;
    this.privateIp = privateIp;

    console.log(
      `[instanceMetadataService] Initialized with ID=${instanceId}, IP=${privateIp}, ENV=${env}`
    );
  },

  async getMetadata(): Promise<{ instanceId: string; privateIp: string }> {
    const token = await this.getToken();

    // build headers only if token exists
    const headers: Record<string, string> = {};
    if (token) headers["X-aws-ec2-metadata-token"] = token;

    try {
      // --- Step 1: Get instance ID ---
      const idRes = await fetch(`${METADATA_BASE_URL}/meta-data/instance-id`, {
        headers,
      });
      const instanceId = idRes.ok ? (await idRes.text()).trim() : null;

      // --- Step 2: Get private IP ---
      const ipRes = await fetch(`${METADATA_BASE_URL}/meta-data/local-ipv4`, {
        headers,
      });
      const privateIp = ipRes.ok ? (await ipRes.text()).trim() : null;

      if (instanceId && privateIp) {
        return { instanceId, privateIp };
      }

      console.warn(
        "[instanceMetadataService] Incomplete metadata, using fallback"
      );
    } catch (err) {
      console.warn(
        `[instanceMetadataService] Failed to contact metadata service: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    // --- Step 3: Fallback for local / non-EC2 environments ---
    const hostname = os.hostname();
    const uuid = crypto.randomUUID();
    return {
      instanceId: `${hostname}-${uuid}`,
      privateIp: "127.0.0.1",
    };
  },

  async getToken(): Promise<string | null> {
    try {
      const res = await fetch(`${METADATA_BASE_URL}/api/token`, {
        method: "PUT",
        headers: {
          "X-aws-ec2-metadata-token-ttl-seconds": "60",
        },
        signal: AbortSignal.timeout(1000),
      });

      if (res.ok) {
        return await res.text();
      }

      console.warn(
        `[instanceMetadataService] IMDSv2 token request failed (status ${res.status}), falling back to IMDSv1`
      );
      return null;
    } catch (err) {
      console.warn(
        "[instanceMetadataService] Could not fetch IMDSv2 token:",
        err
      );
      return null;
    }
  },
};

export default instanceMetadataService;

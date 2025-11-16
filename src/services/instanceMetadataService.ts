import crypto from "crypto";

const METADATA_BASE_URL = "http://169.254.169.254/latest";

const instanceMetadataService = {
  instanceId: null as string | null,
  publicIp: null as string | null,
  environment: "local" as string,

  async init(env: string) {
    this.environment = env;

    const { instanceId, publicIp } = await this.fetchMetadataStrict();

    this.instanceId = instanceId;
    this.publicIp = publicIp;

    console.log(
      `[instanceMetadataService] Initialized: instanceId=${instanceId}, publicIp=${publicIp}, env=${env}`
    );
  },

  async fetchMetadataStrict(): Promise<{ instanceId: string; publicIp: string }> {
    // Local dev bypass
    if (process.env.IS_LOCAL === "true" || this.environment === "local") {
      const id = `local-instance-${crypto.randomUUID()}`;
      console.log(`[instanceMetadataService] Running local, ID=${id}`);
      return { instanceId: id, publicIp: "127.0.0.1" };
    }

    const token = await this.fetchToken();

    const headers = { "X-aws-ec2-metadata-token": token };

    const fetchMeta = async (path: string) => {
      const res = await fetch(`${METADATA_BASE_URL}${path}`, { headers });
      if (!res.ok) {
        throw new Error(`IMDS metadata failed: ${path}, status=${res.status}`);
      }
      return (await res.text()).trim();
    };

    const instanceId = await fetchMeta("/meta-data/instance-id");
    const publicIp = await fetchMeta("/meta-data/public-ipv4");

    if (!publicIp) {
      throw new Error(
        "IMDS returned no public-ipv4. Ensure the EC2 instance has a public IP."
      );
    }

    return { instanceId, publicIp };
  },

  async fetchToken(): Promise<string> {
    const res = await fetch(`${METADATA_BASE_URL}/api/token`, {
      method: "PUT",
      headers: { "X-aws-ec2-metadata-token-ttl-seconds": "21600" },
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to get IMDSv2 token: status=${res.status}. IMDSv2 is required.`
      );
    }

    return await res.text();
  },
};

export default instanceMetadataService;

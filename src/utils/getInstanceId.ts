import os from "os";
import crypto from "crypto";

const getInstanceId = async (): Promise<string> => {
  const METADATA_URL = "http://169.254.169.254/latest";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    // Step 1: Request a session token for IMDSv2
    const tokenRes = await fetch(`${METADATA_URL}/api/token`, {
      method: "PUT",
      headers: {
        "X-aws-ec2-metadata-token-ttl-seconds": "60",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let token: string | null = null;

    if (tokenRes.ok) {
      token = await tokenRes.text();
    } else {
      console.warn(
        `[getInstanceId] Could not fetch IMDSv2 token (status ${tokenRes.status}), falling back to IMDSv1`
      );
    }

    // Step 2: Retrieve the instance ID (with token if available)
    const idController = new AbortController();
    const idTimeout = setTimeout(() => idController.abort(), 1000);

    const res = await fetch(`${METADATA_URL}/meta-data/instance-id`, {
      headers: token ? { "X-aws-ec2-metadata-token": token } : {},
      signal: idController.signal,
    });

    clearTimeout(idTimeout);

    if (res.ok) {
      const instanceId = (await res.text()).trim();
      console.log(`[getInstanceId] Using EC2 instance ID: ${instanceId}`);
      return instanceId;
    }

    console.warn(
      `[getInstanceId] Metadata service responded with status ${res.status}`
    );
  } catch (err) {
    console.warn(
      `[getInstanceId] Failed to retrieve EC2 metadata: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  // Step 3: Fallback for local environments
  const hostname = os.hostname();
  const uuid = crypto.randomUUID();
  const fallbackId = `${hostname}-${uuid}`;
  console.log(`[getInstanceId] Using fallback instance ID: ${fallbackId}`);
  return fallbackId;
};

export default getInstanceId;

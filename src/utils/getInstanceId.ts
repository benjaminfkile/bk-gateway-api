import os from "os";
import crypto from "crypto";

const getInstanceId = async (): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    const res = await fetch(
      "http://169.254.169.254/latest/meta-data/instance-id",
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (res.ok) {
      const instanceId = (await res.text()).trim();
      return instanceId;
    } else {
      console.warn(
        `[getInstanceId] Metadata service responded with status ${res.status}`
      );
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.warn(
        `[getInstanceId] Failed to retrieve EC2 metadata: ${err.message}`
      );
    } else {
      console.warn(
        `[getInstanceId] Unknown error type while fetching EC2 metadata:`,
        err
      );
    }
  }

  // Fallback for local environments
  const hostname = os.hostname();
  const uuid = crypto.randomUUID();
  const fallbackId = `${hostname}-${uuid}`;
  console.log(`[getInstanceId] Using fallback instance ID: ${fallbackId}`);
  return fallbackId;
};

export default getInstanceId;

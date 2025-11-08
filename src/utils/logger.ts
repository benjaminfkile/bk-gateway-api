import serviceLogs from "../db/serviceLogs";
import services from "../db/services";
import instanceService from "../services/instanceService";

type LogLevel = "debug" | "info" | "warning" | "error";

interface PendingLog {
  service_id: number;
  instance_id: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, any>;
}

const logBuffer: PendingLog[] = [];
let flushing = false;
let gatewayServiceId: number | null = null;
let instanceId: string | null = null;

export async function initLogger() {
  // ensure gateway service exists once
  const gatewayService =
    (await services.getByName("gateway-api")) ??
    (await services.insert("gateway-api", "Main Gateway Service"));
  gatewayServiceId = gatewayService.id;

  // grab instance id once
  instanceId = instanceService.getUniqueId();

  // start periodic flush
  setInterval(flushLogs, 2000).unref();
}

/**
 * Queue a log for async insertion (non-blocking)
 */
export function log(
  level: LogLevel,
  message: string,
  meta: Record<string, any> = {}
) {
  if (!gatewayServiceId || !instanceId) {
    console.log(`[${level.toUpperCase()}] ${message}`, meta);
    return;
  }
  logBuffer.push({
    service_id: gatewayServiceId,
    instance_id: instanceId,
    level,
    message,
    meta,
  });
}

/**
 * Flush queued logs in the background
 */
async function flushLogs() {
  if (flushing || logBuffer.length === 0) return;
  flushing = true;
  const batch = logBuffer.splice(0, logBuffer.length);

  try {
    await Promise.all(
      batch.map((entry) =>
        serviceLogs.insert(
          entry.service_id,
          entry.instance_id,
          entry.level,
          entry.message,
          entry.meta
        )
      )
    );
  } catch (err) {
    console.error("[Logger] Failed to flush logs:", err);
  } finally {
    flushing = false;
  }
}

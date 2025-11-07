import { isLocal } from "../utils/isLocal";

const local = isLocal();

const baseServices: Record<
  string,
  { port: number; includeInHealthCheck: boolean; devOnly?: boolean }
> = {
  "portfolio-api": { port: 3001, includeInHealthCheck: true },
  "bengrok-api": { port: 3002, includeInHealthCheck: false },
  "wmsfo-api": { port: 3003, includeInHealthCheck: true },
  "wmsfo-flight-simulator": { port: 3004, includeInHealthCheck: false },
};

export const serviceMap: Record<
  string,
  { url: string; includeInHealthCheck: boolean }
> = Object.fromEntries(
  Object.entries(baseServices).flatMap(([name, { port, includeInHealthCheck, devOnly }]) => {
    const normalUrl = local ? `http://localhost:${port}` : `http://${name}:${port}`;
    const devPort = port + 1000;
    const devUrl = local ? `http://localhost:${devPort}` : `http://${name}-dev:${devPort}`;

    const entries: [string, { url: string; includeInHealthCheck: boolean }][] = [];

    //Only include normal version if it's not dev-only
    if (!devOnly) {
      entries.push([name, { url: normalUrl, includeInHealthCheck }]);
    }

    //Always include dev variant if local or dev-only
    entries.push([`${name}-dev`, { url: devUrl, includeInHealthCheck: false }]);

    console.log(entries)
    return entries;
  })
);

import { isLocal } from "../utils/isLocal";

const local = isLocal();

const baseServices: Record<
  string,
  { port: number; includeInHealthCheck: boolean; includeDevApi?: boolean }
> = {
  "portfolio-api": { port: 3001, includeInHealthCheck: true},
  // "bengrok-api": { port: 3002, includeInHealthCheck: false },
  "wmsfo-api": { port: 3003, includeInHealthCheck: true, includeDevApi: true  },
  "wmsfo-flight-simulator": { port: 3004, includeInHealthCheck: false },
};

export const serviceMap: Record<
  string,
  { url: string; includeInHealthCheck: boolean }
> = Object.fromEntries(
  Object.entries(baseServices).flatMap(([name, { port, includeInHealthCheck, includeDevApi }]) => {
    const normalUrl = local ? `http://localhost:${port}` : `http://${name}:${port}`;
    const entries: [string, { url: string; includeInHealthCheck: boolean }][] = [
      [name, { url: normalUrl, includeInHealthCheck }],
    ];

    if (includeDevApi) {
      const devPort = port + 1000;
      const devUrl = local ? `http://localhost:${devPort}` : `http://${name}-dev:${devPort}`;
      entries.push([`${name}-dev`, { url: devUrl, includeInHealthCheck: false }]);
    }

    return entries;
  })
);

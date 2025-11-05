import { isLocal } from "../utils/isLocal";

const local = isLocal();

const baseServices: Record<
  string,
  { port: number; includeInHealthCheck: boolean }
> = {
  "portfolio-api": { port: 3001, includeInHealthCheck: true },
  "bengrok-api": { port: 3002, includeInHealthCheck: false },
  "wmsfo-api": { port: 3003, includeInHealthCheck: true },
};

// Build standard + dev variants
export const serviceMap: Record<
  string,
  { url: string; includeInHealthCheck: boolean }
> = Object.fromEntries(
  Object.entries(baseServices).flatMap(([name, { port, includeInHealthCheck }]) => {
    const normalUrl = local ? `http://localhost:${port}` : `http://${name}:${port}`;
    const devPort = port + 1000;
    const devUrl = local ? `http://localhost:${devPort}` : `http://${name}-dev:${devPort}`;

    return [
      [name, { url: normalUrl, includeInHealthCheck }],
      [`${name}-dev`, { url: devUrl, includeInHealthCheck }],
    ];
  })
);

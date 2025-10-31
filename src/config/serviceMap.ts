import { isLocal } from "../utils/isLocal";

const local = isLocal();

export const serviceMap: Record<string, { url: string; includeInHealthCheck: boolean }> = {
  "portfolio-api": {
    url: local ? "http://localhost:3001" : "http://portfolio-api:3001",
    includeInHealthCheck: true,
  },
  "bengrok-api": {
    url: local ? "http://localhost:3002" : "http://bengrok-api:3002",
    includeInHealthCheck: false,
  },
  "wmsfo-api": {
    url: local ? "http://localhost:3003" : "http://wmsfo-api:3003",
    includeInHealthCheck: true,
  },
};

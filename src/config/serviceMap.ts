
const isLocal = process.env.IS_LOCAL === "true";

console.log("islocal", isLocal)

export const serviceMap: Record<string, { url: string; includeInHealthCheck: boolean }> = {
  "portfolio-api": {
    url: isLocal ? "http://localhost:3001" : "http://portfolio-api:3001",
    includeInHealthCheck: true,
  },
  "bengrok-api": {
    url: isLocal ? "http://localhost:3002" : "http://bengrok-api:3002",
    includeInHealthCheck: false,
  },
  "wmsfo-api": {
    url: isLocal ? "http://localhost:3003" : "http://wmsfo-api:3003",
    includeInHealthCheck: true,
  },
};

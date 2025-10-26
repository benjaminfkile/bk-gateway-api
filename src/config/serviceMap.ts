// Central map of internal services for the Gateway API

export interface ServiceDefinition {
  url: string;
  includeInHealthCheck: boolean;
}

export const serviceMap: Record<string, ServiceDefinition> = {
  "portfolio-api": {
    url: "http://portfolio-api:3001",
    includeInHealthCheck: true,
  },
  "bengrok-api": {
    url: "http://bengrok-api:3002",
    includeInHealthCheck: false,
  },
  "wmsfo-api": {
    url: "http://wmsfo-api:3003",
    includeInHealthCheck: true,
  },
};

export type ServiceName = keyof typeof serviceMap;

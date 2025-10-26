// Central map of internal services for the Gateway API

export interface ServiceDefinition {
  url: string;
  includeInHealthCheck: boolean;
}

export const serviceMap: Record<string, ServiceDefinition> = {
  portfolio: {
    url: "http://localhost:3001",
    includeInHealthCheck: true,
  },
  bengrok: {
    url: "http://localhost:3002",
    includeInHealthCheck: false,
  },
  wmsfo: {
    url: "http://localhost:3003",
    includeInHealthCheck: true,
  },

};

export type ServiceName = keyof typeof serviceMap;

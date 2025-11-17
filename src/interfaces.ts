import { LogLevel, TNodeEnviromnent } from "./types";

export interface IAPISecrets {
  node_env: string
  db_name: string
  master_password: string
  master_password_hash: string
}

export interface IDBSecrets {
  username: string;
  password: string;
  engine: "postgres";
  host: string;
  proxy_url: string;
  port: 5432;
  dbInstanceIdentifier: string;
}

export interface IDBHealth {
  connected: boolean;
  connectionUsesProxy: boolean;
  logs?: {
    messages: string[];
    host?: string;
    timestamp: string;
    error?: string;
  };
}

export interface IEC2Launch {
  id?: number;
  instance_id: string;
  launched_at?: string;
  is_leader: boolean
  public_ip: string
  private_ip: string
}

export interface IInstanceMessage {
  type: string;
  data?: string;
}

export interface IService {
  id: number;
  name: string;
  description?: string | null;
}

export interface IServicePoolTimeout {
  id: number;
  service_id: number;
  idle_timeout_ms: number;
  last_updated?: Date;
}

export interface IServiceLog {
  id?: number;
  service_id: number;
  instance_id: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, any>;
  created_at?: Date;
}

export interface IServiceLogSettings {
  id?: number;
  service_id: number;
  enabled: boolean;
  min_level: LogLevel
  updated_at?: Date;
}

export interface IAboutMe {
  amILeader: boolean;
  myInstanceId: string;
  publicIp: string;
  privateIp: string
}

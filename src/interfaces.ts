import { LogLevel, TNodeEnviromnent } from "./types";

export interface IAPISecrets {
  db_username: string;
  db_password: string;
  db_engine: string;
  db_proxy_url: string;
  db_host: string;
  db_port: number;
  db_dbInstanceIdentifier: string;
  db_name: string;
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_region: string;
  node_env: TNodeEnviromnent;
  port: string;
  s3_bucket_name: string;
  location_data_url: string;
  contact_us_email: string;
  contact_us_html_file: string;
  mailer_key: string;
  mail_hostname: string;
  master_key_string: string;
  master_string: string;
  no_reply_email: string;
  receipt_html_file: string;
  master_password_hash: string;
  heroku_sync_mrs_claus_enabled: "true" | "false";
  heroku_sync_mrs_claus_url: string;
  heroku_sync_rudolph_enabled: "true" | "false";
  heroku_sync_rudolph_url: string;
  heroku_sync_rudolph_username: string;
  heroku_sync_rudolph_password: string;
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
  myIp: string;
}

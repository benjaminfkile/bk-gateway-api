import knex, { Knex } from "knex";
import { TNodeEnviromnent } from "../types";
import { IDBSecrets, IAPISecrets } from "../interfaces";
import health from "./health";

let db: Knex | null = null;

export async function initDb(
  dbSecrets: IDBSecrets,
  appSecrets: IAPISecrets,
  // environmnet: TNodeEnviromnent,
): Promise<Knex> {
  if (db) return db;

  const { username, password } = dbSecrets;

  const { db_name, db_host } = appSecrets;

  // const dbUrl = environmnet !== "local" ? proxy_url : host;
  const dbUrl = db_host; //proxy is currently disbaled, its exensive AF

  db = knex({
    client: "pg",
    connection: {
      host: dbUrl,
      user: username,
      password: password,
      database: db_name,
      port: 5432,
      ssl: { rejectUnauthorized: false },
    },
  });

  const dbHealth = await health.getDBConnectionHealth(db, true);

  console.log(dbHealth.logs);

  return db;
}

export function getDb(): Knex {
  if (!db) {
    throw new Error("Database has not been initialized. Call initDb() first.");
  }
  return db;
}

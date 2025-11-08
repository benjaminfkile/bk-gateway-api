import knex, { Knex } from "knex";
import { TNodeEnviromnent } from "../types";
import { IDBSecrets, IAPISecrets } from "../interfaces";
import health from "./health";

let db: Knex | null = null;

export async function initDb(
  dbSecrets: IDBSecrets,
  appSecrets: IAPISecrets,
  environmnet: TNodeEnviromnent
): Promise<Knex> {
  if (db) return db;

  const { username, password, host, proxy_url, port } =
    dbSecrets;

  const {db_name} = appSecrets

  const dbUrl = environmnet !== "local" ? proxy_url : host;

  db = knex({
    client: "pg",
    connection: {
      host: dbUrl,
      user: username,
      password: password,
      database: db_name,
      port: port,
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

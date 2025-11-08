import { getDb } from "../db/db";
import { IService } from "../interfaces";

const services = {
  async insert(name: string, description?: string) {
    const db = getDb("services => insert()");
    const [row] = await db<IService>("services")
      .insert({ name, description })
      .returning("*");
    return row;
  },

  async getByName(name: string) {
    const db = getDb("services => getByName()");
    return db<IService>("services").where({ name }).first();
  },

  async getById(id: number) {
    const db = getDb("services => getById()");
    return db<IService>("services").where({ id }).first();
  },

  async getAll() {
    const db = getDb("services => getAll()");
    return db<IService>("services").select("*").orderBy("id");
  },

  async delete(id: number) {
    const db = getDb("services => delete()");
    return db<IService>("services").where({ id }).del();
  },
};

export default services;

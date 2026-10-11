import { Pool } from "pg";

const database = process.env.DB_NAME ?? "ticketing";

if (process.env.NODE_ENV === "test" && database !== "ticketing_test") {
  throw new Error("Tests must use the ticketing_test database");
}

export const db = new Pool({
  database,
});

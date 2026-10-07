import { Pool } from "pg";

export const db = new Pool({
    database: "ticketing",
});
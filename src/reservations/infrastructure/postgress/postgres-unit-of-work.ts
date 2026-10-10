import type { Pool } from "pg";
import type {
  UnitOfWork,
  TransactionContext,
} from "../../application/ports/unit-of-work.js";

import { PostgresReservationRepository } from "./postgres-reservation.repository.js";
import { PostgresInventoryRepository } from "./postgres-inventory.repository.js";
import { PostgresEventRepository } from "../../../events/infrastructure/postgres/postgres-event-repository.js";

export class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const inventory = new PostgresInventoryRepository(client);
      const reservations = new PostgresReservationRepository(client);
      const events = new PostgresEventRepository(client);
      const workResult = await work({ inventory, reservations, events });
      await client.query("COMMIT");
      return workResult;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

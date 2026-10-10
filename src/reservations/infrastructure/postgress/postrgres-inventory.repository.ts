import type { PoolClient } from "pg";
import { GACategory } from "../../reservations.types.js";
import type { InventoryRepository } from "../../application/ports/inventory.repository.js";

export class PostgresInventoryRepository implements InventoryRepository {
  constructor(private readonly client: PoolClient) {}

  async acquireGACategory(categoryId: number): Promise<GACategory | null> {
    const result = await this.client.query(
      `
        SELECT id, event_id, capacity
        FROM ticket_categories
        WHERE id = $1
        FOR UPDATE
      `,
      [categoryId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      eventId: result.rows[0].event_id,
      capacity: result.rows[0].capacity,
    };
  }

  async getReservedGAQuantity(categoryId: number): Promise<number> {
    const reservedResult = await this.client.query(
      `
          SELECT COALESCE(SUM(rga.quantity), 0) AS reserved_quantity
          FROM reserved_ga rga
          JOIN reservations r ON r.id = rga.reservation_id
          WHERE r.status = 'ACTIVE'
            AND r.expires_at > NOW()
            AND rga.ticket_category_id = $1`,
      [categoryId],
    );
    return Number(reservedResult.rows[0].reserved_quantity);
  }
}

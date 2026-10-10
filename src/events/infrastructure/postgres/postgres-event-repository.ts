import type { PoolClient } from "pg";
import type { EventRepository } from "../../application/ports/events.repository.js";
import type { Event } from "../../events.types.js";

export class PostgresEventRepository implements EventRepository {
  constructor(private readonly client: PoolClient) {}

  async findById(id: number): Promise<Event | null> {
    const result = await this.client.query(
      `
        SELECT e.id, e.name, e.starts_at, e.venue_id, v.name AS venue_name
        FROM events e 
        JOIN venues v 
        on v.id = e.venue_id
        where e.id = $1
      `,
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      startsAt: row.starts_at,
      venueName: row.venue_name,
      venueId: row.venue_id,
    };
  }
}

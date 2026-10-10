import type { PoolClient } from "pg";
import type { Reservation } from "../../reservations.types.js";
import type { ReservationRepository } from "../../application/ports/reservation.repository.js";

export class PostgresReservationRepository implements ReservationRepository {
  constructor(private readonly client: PoolClient) {}
  async create(eventId: number): Promise<Reservation> {
    const reservationResult = await this.client.query(
      `
          INSERT INTO reservations (
            event_id,
            status,
            expires_at
          )
          VALUES ($1, 'ACTIVE', NOW() + INTERVAL '10 minutes')
          RETURNING id, event_id, status, expires_at
          `,
      [eventId],
    );
    const row = reservationResult.rows[0];

    return {
      id: row.id,
      eventId: row.event_id,
      status: row.status,
      expiresAt: row.expires_at,
    };
  }

  async reserveGA(
    reservationId: number,
    ticketCategoryId: number,
    quantity: number,
  ): Promise<void> {
    await this.client.query(
      `
          INSERT INTO reserved_ga (
            reservation_id,
            ticket_category_id,
            quantity
          )
          VALUES ($1, $2, $3)
        `,
      [reservationId, ticketCategoryId, quantity],
    );
  }

  async reserveSeats(reservationId: number, seatIds: number[]): Promise<void> {
    await this.client.query(
      `INSERT INTO reserved_seats (reservation_id, event_seat_id)
          SELECT $1, unnest($2::int[])`,
      [reservationId, seatIds],
    );
  }
}

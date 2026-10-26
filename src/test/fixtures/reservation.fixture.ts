import { db } from "../../db.js";

export async function insertReservation(eventId: number): Promise<number> {
  const result = await db.query(
    `
      INSERT INTO reservations (event_id, status, expires_at)
      VALUES ($1, 'ACTIVE', NOW() + INTERVAL '10 minutes')
      RETURNING id
    `,
    [eventId],
  );

  return result.rows[0].id;
}

export async function startReservationPendingPayment(
  reservationId: number,
): Promise<void> {
  await db.query(
    ` UPDATE reservations
        SET status = 'PENDING_PAYMENT',
        payment_deadline = NOW() + INTERVAL '5 minutes'
        WHERE id = $1`,
    [reservationId],
  );
}

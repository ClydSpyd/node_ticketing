import { db } from "../../db.js";

export const insertEvent = async (venueId: number): Promise<number> => {
  const eventResult = await db.query(
    `
    INSERT INTO events (name, starts_at, venue_id)
    VALUES ('Test Concert', NOW() + INTERVAL '7 days', $1)
    RETURNING id
  `,
    [venueId],
  );

  const eventId = eventResult.rows[0].id;

  return eventId;
};

export const insertTicketCategory = async (
  eventId: number,
): Promise<number> => {
  const categoryResult = await db.query(
    `INSERT INTO ticket_categories (event_id, name, price, capacity)
     VALUES ($1, 'General Admission', 100, 5)
     RETURNING id`,
    [eventId],
  );

  const categoryId = categoryResult.rows[0].id;

  return categoryId;
};

export const insertEventSeat = async (eventId: number, venueSeatId: number): Promise<number> => {
  const eventSeatResult = await db.query(`
        INSERT INTO event_seats (event_id, venue_seat_id, price)
        VALUES ($1, $2, 100)
        RETURNING id
    `, [eventId, venueSeatId]);

  const eventSeatId = eventSeatResult.rows[0].id;

  return eventSeatId;
};

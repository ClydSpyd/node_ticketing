import { db } from "../../db.js";

export const insertVenue = async (): Promise<number> => {
  const venueResult = await db.query(`
        INSERT INTO venues (name)
        VALUES ('Test Venue')
        RETURNING id
    `);

  const venueId = venueResult.rows[0].id;

  return venueId;
};

export const insertVenueSeat = async (venueId: number): Promise<number> => {
  const seatResult = await db.query(`
        INSERT INTO venue_seats (venue_id, section, seat_number, row_number)
        VALUES ($1, 'A', 1, 1)
        RETURNING id
    `, [venueId]);

  const seatId = seatResult.rows[0].id;

  return seatId;
};
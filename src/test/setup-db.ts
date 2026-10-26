import { db } from "../db.js";

export async function resetTestDatabase(): Promise<void> {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.DB_NAME !== "ticketing_test"
  ) {
    throw new Error("Refusing to reset a non-test database");
  }

  await db.query(`
    TRUNCATE TABLE
      reserved_ga,
      reserved_seats,
      reservations,
      event_seats,
      venue_seats,
      ticket_categories,
      events,
      venues
    RESTART IDENTITY CASCADE
  `);
}

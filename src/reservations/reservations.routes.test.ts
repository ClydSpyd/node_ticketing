import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { buildApp } from "../app.js";
import { db } from "../db.js";

const app = buildApp();

let categoryId: number;

beforeEach(async () => {
  if (process.env.DB_NAME !== "ticketing_test") {
    throw new Error("Refusing to truncate a non-test database");
  }
  // clean up data from previous tests
  await db.query(`
    TRUNCATE TABLE
      reserved_ga,
      reserved_seats,
      reservations,
      ticket_categories,
      event_seats,
      events,
      venues
    RESTART IDENTITY CASCADE
  `);

  // insert test venue
  const venueResult = await db.query(`
        INSERT INTO venues (name)
        VALUES ('Test Venue')
        RETURNING id
    `);

  const venueId = venueResult.rows[0].id;

  // insert test event
  const eventResult = await db.query(
    `
    INSERT INTO events (name, starts_at, venue_id)
    VALUES ('Test Concert', NOW() + INTERVAL '7 days', $1)
    RETURNING id
  `,
    [venueId],
  );

  const eventId = eventResult.rows[0].id;

  // insert test GA ticket category for test event
  const categoryResult = await db.query(
    `INSERT INTO ticket_categories (event_id, name, price, capacity)
     VALUES ($1, 'General Admission', 100, 5)
     RETURNING id`,
    [eventId],
  );

  // store ID for use in test calls
  categoryId = categoryResult.rows[0].id;
});

afterAll(async () => {
  await app.close();
  await db.end();
});

describe("POST /reservations/ga", () => {
  it("returns 201 and reservation upon succesful insertion", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/reservations/ga",
      payload: {
        categoryId,
        quantity: 5,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: expect.any(Number),
      eventId: expect.any(Number),
      status: "ACTIVE",
      expiresAt: expect.any(String),
    });

    const reservation = response.json();

    // verify the database state
    const result = await db.query(
      `SELECT quantity
            FROM reserved_ga
            WHERE reservation_id = $1`,
      [reservation.id],
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].quantity).toBe(5);
  });

  it("prevents overselling during concurrent GA reservations", async () => {
    const payload = {
      categoryId,
      quantity: 4,
    };

    const [responseA, responseB] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/reservations/ga",
        payload,
      }),
      app.inject({
        method: "POST",
        url: "/reservations/ga",
        payload,
      }),
    ]);

    const statusCodes = [responseA.statusCode, responseB.statusCode].sort();

    expect(statusCodes).toEqual([201, 409]);

    const result = await db.query(
      `SELECT COALESCE(SUM(rga.quantity), 0) AS reserved_quantity
     FROM reserved_ga rga
     JOIN reservations r ON r.id = rga.reservation_id
     WHERE rga.ticket_category_id = $1
       AND r.status = 'ACTIVE'
       AND r.expires_at > NOW()`,
      [categoryId],
    );

    expect(Number(result.rows[0].reserved_quantity)).toBe(4);
  });

  it("returns 404 when the GA category does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/reservations/ga",
      payload: {
        categoryId: 999999,
        quantity: 1,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Ticket category not found",
    });
  });

  it("returns 409 when requested quantity unavailable", async () => {
    const firstResponse = await app.inject({
      method: "POST",
      url: "/reservations/ga",
      payload: {
        categoryId,
        quantity: 5,
      },
    });

    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await app.inject({
      method: "POST",
      url: "/reservations/ga",
      payload: {
        categoryId,
        quantity: 1,
      },
    });

    expect(secondResponse.statusCode).toBe(409);
  });
});

//  it("rejects requests for unknown events", async () => {
//     const response = await app.inject({
//         method: "POST",
//         url: "reservations/seats",
//         payload: {
//             eventId: 999999,
//             eventSeatIds:[1,2,3]
//         }
//     });

//     expect(response.statusCode).toBe(404);
//     expect(response.json()).toEqual({
//       error: "Event not found",
//     });
//   })

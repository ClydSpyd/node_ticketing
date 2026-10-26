import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { buildApp } from "../app.js";
import { db } from "../db.js";
import { resetTestDatabase } from "../test/setup-db.js";
import {
  insertVenue,
  insertVenueSeat,
} from "../test/fixtures/venue.fixture.js";
import {
  insertEvent,
  insertEventSeat,
  insertTicketCategory,
} from "../test/fixtures/event.fixture.js";
import {
  insertReservation,
  startReservationPendingPayment,
} from "../test/fixtures/reservation.fixture.js";

const app = buildApp();

let categoryId: number;
let venueId: number;
let venueSeatId: number;
let eventId: number;
let eventSeatId: number;

beforeEach(async () => {
  // clean up data from previous tests
  await resetTestDatabase();

  // insert test venue
  venueId = await insertVenue();

  // insert test venue_seat
  venueSeatId = await insertVenueSeat(venueId);

  // insert test event
  eventId = await insertEvent(venueId);

  // insert test event_seat
  eventSeatId = await insertEventSeat(eventId, venueSeatId);

  // insert test GA ticket category for test event
  categoryId = await insertTicketCategory(eventId);
});

afterAll(async () => {
  await app.close();
  await db.end();
});

describe("POST /reservations/seats", () => {
  it("returns 201 and reservation upon succesful insertion", async () => {
    const payload = {
      eventId,
      eventSeatIds: [eventSeatId],
    };

    const response = await app.inject({
      method: "POST",
      url: "/reservations/seats",
      payload,
    });

    const reservedSeats = await db.query(
      `
    SELECT reservation_id, event_seat_id
    FROM reserved_seats
    WHERE event_seat_id = $1
  `,
      [eventSeatId],
    );

    expect(response.statusCode).toBe(201);
    expect(reservedSeats.rows).toHaveLength(1);
  });

  it("prevents multiple requests from reserving the same seats", async () => {
    const payload = {
      eventId,
      eventSeatIds: [eventSeatId],
    };

    const [responseA, responseB] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/reservations/seats",
        payload,
      }),
      app.inject({
        method: "POST",
        url: "/reservations/seats",
        payload,
      }),
    ]);

    const statusCodes = [responseA.statusCode, responseB.statusCode].sort();

    const reservedSeats = await db.query(
      `
    SELECT reservation_id, event_seat_id
    FROM reserved_seats
    WHERE event_seat_id = $1
  `,
      [eventSeatId],
    );

    expect(statusCodes).toEqual([201, 409]);
    expect(reservedSeats.rows).toHaveLength(1);
  });

  it("returns 404 for unknown events", async () => {
    const response = await app.inject({
      method: "POST",
      url: "reservations/seats",
      payload: {
        eventId: 999999,
        eventSeatIds: [1, 2, 3],
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Event not found",
    });
  });
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

describe("POST /reservations/start-payment", () => {
  it("sucessfully starts payment on an ACTIVE reservation", async () => {
    const reservationId = await insertReservation(eventId);

    const response = await app.inject({
      method: "POST",
      url: "/reservations/start-payment",
      payload: {
        reservationId,
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("returns 404 when the reservation does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/reservations/start-payment",
      payload: {
        reservationId: 1234,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 409 for invalid transition attempt", async () => {
    const reservationId = await insertReservation(eventId);

    await startReservationPendingPayment(reservationId);

    const response = await app.inject({
      method: "POST",
      url: "/reservations/start-payment",
      payload: {
        reservationId,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "Invalid state transition",
    });
  });
});

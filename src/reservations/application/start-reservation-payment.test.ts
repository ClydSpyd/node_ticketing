import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { db } from "../../db.js";
import { resetTestDatabase } from "../../test/setup-db.js";
import { insertVenue } from "../../test/fixtures/venue.fixture.js";
import { insertEvent } from "../../test/fixtures/event.fixture.js";
import { startReservationPayment } from "./start-reservation-payment.js";
import { PostgresUnitOfWork } from "../infrastructure/postgress/postgres-unit-of-work.js";
import { insertReservation } from "../../test/fixtures/reservation.fixture.js";
import {
  ReservationExpiredError,
  StateTransitionNotPermittedError,
} from "../reservations.error.js";

let eventId: number;

beforeEach(async () => {
  // clean up data from previous tests
  await resetTestDatabase();

  // insert test venue
  const venueId = await insertVenue();

  // insert test event
  eventId = await insertEvent(venueId);
});

// clean up database connection after all tests have run
afterAll(async () => {
  await db.end();
});

describe("start reservation payment", () => {
  it("should allow transition from ACTIVE to PENDING_PAYMENT", async () => {
    const reservationId = await insertReservation(eventId);
    const unitOfWork = new PostgresUnitOfWork(db);

    await startReservationPayment({ reservationId }, unitOfWork);

    const result = await db.query(
      `SELECT status
       FROM reservations
       WHERE id = $1`,
      [reservationId],
    );

    expect(result.rows[0].status).toBe("PENDING_PAYMENT");
  });

  it("should not allow an expired reservation to transition to PENDING_PAYMENT", async () => {
    const reservationId = await insertReservation(eventId);

    await db.query(
      `UPDATE reservations
       SET expires_at = $1
       WHERE id = $2`,
      [new Date(Date.now() - 1000), reservationId],
    );

    const unitOfWork = new PostgresUnitOfWork(db);
    await expect(
      startReservationPayment({ reservationId }, unitOfWork),
    ).rejects.toThrow(ReservationExpiredError);

    // expect reservation to be unchanged after failed attempt
    const result = await db.query(
      `SELECT status, payment_deadline
      FROM reservations
      WHERE id = $1`,
      [reservationId],
    );

    expect(result.rows[0].status).toBe("ACTIVE");
    expect(result.rows[0].payment_deadline).toBeNull();
  });

  it("should not allow a startReservationPayment on a reservation already in PENDING_PAYMENT", async () => {
    const reservationId = await insertReservation(eventId);
    const unitOfWork = new PostgresUnitOfWork(db);

    await startReservationPayment({ reservationId }, unitOfWork);

    await expect(
      startReservationPayment({ reservationId }, unitOfWork),
    ).rejects.toThrow(StateTransitionNotPermittedError);
  });
});

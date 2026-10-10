import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { db } from "../db.js";

import {
  ReserveSeatsPayloadSchema,
  ReserveGAPayloadSchema,
} from "./reservations.schemas.js";
import { createGAReservation } from "./application/create-ga-reservation.js";
import { PostgresUnitOfWork } from "./infrastructure/postgress/postgres-unit-of-work.js";
import {
  CategoryNotFoundError,
  InsufficientInventoryError,
} from "./reservations.error.js";

export const reservationsRoutes = (app: FastifyInstance) => {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const unitOfWork = new PostgresUnitOfWork(db);

  typedApp.post(
    "/reservations/seats",
    {
      schema: {
        body: ReserveSeatsPayloadSchema,
      },
    },
    async (req, reply) => {
      const { eventId, eventSeatIds } = req.body;
      const client = await db.connect();
      try {
        await client.query("BEGIN");

        // check if the event exists
        const eventResult = await client.query(
          `SELECT * FROM events where id=$1`,
          [eventId],
        );

        if (eventResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.status(404).send({ error: "Event not found" });
        }

        // lock the requested seats for this event to prevent race conditions
        const seatsResult = await client.query(
          `SELECT id
            FROM event_seats
            WHERE event_id = $1
                AND id = ANY($2::int[])
            FOR UPDATE`,
          [eventId, eventSeatIds],
        );

        // check if all requested seats exist for this event
        if (seatsResult.rows.length !== eventSeatIds.length) {
          await client.query("ROLLBACK");

          return reply.status(404).send({
            error: "One or more requested seats were not found for this event",
          });
        }

        // check if any of the requested seats are already reserved
        const reservedResult = await client.query(
          `SELECT rs.event_seat_id
            FROM reserved_seats rs
            JOIN reservations r
                ON rs.reservation_id = r.id
            WHERE rs.event_seat_id = ANY($1::int[])
                AND r.status = 'ACTIVE'
                AND r.expires_at > NOW()`,
          [eventSeatIds],
        );

        // if any of the requested seats are already reserved, return a conflict error
        if (reservedResult.rows.length > 0) {
          await client.query("ROLLBACK");

          return reply.status(409).send({
            error: "One or more requested seats are already reserved",
          });
        }

        // insert the reservation
        const reservationResult = await client.query(
          `INSERT INTO reservations (
            event_id,
            status,
            expires_at
        )
        VALUES ($1, 'ACTIVE', NOW() + INTERVAL '10 minutes')
        RETURNING id, status, expires_at`,
          [eventId],
        );

        // get the inserted reservation
        const reservation = reservationResult.rows[0];

        // insert the reserved seats for this reservation
        await client.query(
          `INSERT INTO reserved_seats (reservation_id, event_seat_id)
          SELECT $1, unnest($2::int[])`,
          [reservation.id, eventSeatIds],
        );

        await client.query("COMMIT");
        return reply.status(201).send(reservation);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  typedApp.post(
    "/reservations/ga",
    {
      schema: { body: ReserveGAPayloadSchema },
    },
    async (request, reply) => {
      try {
        const { categoryId, quantity } = request.body;
        const reservation = await createGAReservation(
          { categoryId, quantity },
          unitOfWork,
        );

        return reply.status(201).send(reservation);
      } catch (error) {
        if (error instanceof CategoryNotFoundError) {
          return reply.status(404).send({
            error: "Ticket category not found",
          });
        }

        if (error instanceof InsufficientInventoryError) {
          return reply.status(409).send({
            error: "Requested capacity unavailable",
          });
        }

        throw error; // Unexpected errors handled by Fastify
      }
    },
  );
};

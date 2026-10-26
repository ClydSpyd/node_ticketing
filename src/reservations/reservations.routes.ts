import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { db } from "../db.js";
import {
  ReserveSeatsPayloadSchema,
  ReserveGAPayloadSchema,
  startPaymentPayloadSchema,
} from "./reservations.schemas.js";
import { createGAReservation } from "./application/create-ga-reservation.js";
import { PostgresUnitOfWork } from "./infrastructure/postgress/postgres-unit-of-work.js";
import {
  CategoryNotFoundError,
  InsufficientInventoryError,
  SeatsNotFoundError,
  ReservationNotFoundError,
  StateTransitionNotPermittedError,
  ReservationExpiredError,
} from "./reservations.error.js";
import { createSeatReservation } from "./application/create-seat-reservation.js";
import { EventNotFoundError } from "../events/events.error.js";
import { startReservationPayment } from "./application/start-reservation-payment.js";

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
      try {
        const { eventId, eventSeatIds } = req.body;
        const reservation = await createSeatReservation(
          { eventId, seatIds: eventSeatIds },
          unitOfWork,
        );

        return reply.status(201).send(reservation);
      } catch (error) {
        if (error instanceof EventNotFoundError) {
          return reply.status(404).send({
            error: "Event not found",
          });
        }
        if (error instanceof SeatsNotFoundError) {
          return reply.status(404).send({
            error: "Seats not found",
          });
        }
        if (error instanceof InsufficientInventoryError) {
          return reply.status(409).send({
            error: "One or more seats unavailable",
          });
        }

        throw error; // Unexpected errors handled by Fastify
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

  typedApp.post(
    "/reservations/start-payment",
    {
      schema: {
        body: startPaymentPayloadSchema,
      },
    },
    async (request, reply) => {
      try {
        const { reservationId } = request.body;
        await startReservationPayment({ reservationId }, unitOfWork);
        return reply.status(200).send({ message: "PENDING_PAYMENT" });
      } catch (error) {
        if (error instanceof ReservationNotFoundError) {
          return reply.status(404).send({
            error: "Reservation not found",
          });
        }
        if (error instanceof ReservationExpiredError) {
          return reply.status(409).send({
            error: "Reservation has expired",
          });
        }
        if (error instanceof StateTransitionNotPermittedError) {
          return reply.status(409).send({
            error: "Invalid state transition",
          });
        }

        throw error; // Unexpected errors handled by Fastify
      }
    },
  );
};

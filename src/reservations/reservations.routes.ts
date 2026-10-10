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
  SeatsNotFoundError,
} from "./reservations.error.js";
import { createSeatReservation } from "./application/create-seat-reservation.js";
import { EventNotFoundError } from "../events/events.error.js";

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
        if(error instanceof SeatsNotFoundError){
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
};

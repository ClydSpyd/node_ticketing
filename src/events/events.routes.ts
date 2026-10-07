import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { db } from "../db.js";

import {
  GetEventPayloadSchema,
  CreateEventPayloadSchema,
} from "./events.schemas.js";

export const eventRoutes = async (app: FastifyInstance) => {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();

  typedApp.get(
    "/events/:eventId",
    {
      schema: {
        params: GetEventPayloadSchema,
      },
    },
    async (req, reply) => {
      const eventId = req.params.eventId;

      const response = await db.query(
        `SELECT e.id, e.name, e.starts_at, v.name AS venue_name, v.id AS venue_id
          FROM events e    
          JOIN venues v 
          ON e.venue_id = v.id 
          WHERE e.id=$1`,
        [eventId],
      );

      if (response.rows.length === 0) {
        return reply.status(404).send({ error: "Event not found" });
      }

      return reply.status(200).send(response.rows[0]);
    },
  );

  typedApp.post(
    "/events",
    {
      schema: {
        body: CreateEventPayloadSchema,
      },
    },
    async (req, reply) => {
      const { name, venueId, startsAt } = req.body;

      const response = await db.query(
        "INSERT INTO events (name, venue_id, starts_at)\
         VALUES ($1, $2, $3) \
         RETURNING id, name, starts_at",
        [name, venueId, startsAt],
      );

      return reply.status(201).send(response.rows[0]);
    },
  );
};

import { Type } from "@fastify/type-provider-typebox";

export const GetEventPayloadSchema = Type.Object({
  eventId: Type.Integer(),
});

export const CreateEventPayloadSchema = Type.Object({
  name: Type.String(),
  venueId: Type.Integer(),
  startsAt: Type.String({ format: "date-time" }),
});

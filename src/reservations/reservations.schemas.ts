import { Type } from "@fastify/type-provider-typebox";

export const ReserveSeatsPayloadSchema = Type.Object({
  eventId: Type.Integer(),
  eventSeatIds: Type.Array(Type.Integer(), {
    minItems: 1,
    uniqueItems: true,
  }),
});

export const ReserveGAPayloadSchema = Type.Object({
  categoryId: Type.Integer(),
  quantity: Type.Integer({
    minimum: 1,
  }),
});

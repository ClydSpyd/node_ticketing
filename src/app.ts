import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

import { eventRoutes } from "./events/events.routes.js";
import { reservationsRoutes } from "./reservations/reservations.routes.js";

export function buildApp() {
  const app = Fastify({}).withTypeProvider<TypeBoxTypeProvider>();

  app.get("/health", async () => {
    return {
      status: "ok :)",
    };
  });

  app.register(eventRoutes);
  app.register(reservationsRoutes);

  return app;
}

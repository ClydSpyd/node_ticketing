import { buildApp } from "./app.js";

const app = buildApp();

try {
  await app.listen({ port: 8080 });
  console.log("Server listening on port 8080");
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

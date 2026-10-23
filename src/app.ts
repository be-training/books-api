import Fastify, { FastifyInstance } from "fastify";
import databasePlugin from "./plugins/database.plugin.js";
import requestIdPlugin from "./plugins/request-id.plugin.js";
import errorHandlerPlugin from "./plugins/error-handler.plugin.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  // Core Infrastructure Plugins
  void app.register(requestIdPlugin);
  void app.register(errorHandlerPlugin);
  void app.register(databasePlugin);

  // Health check endpoint
  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}

import Fastify, { FastifyInstance } from "fastify";
import databasePlugin from "./plugins/database.plugin.js";
import containerPlugin from "./plugins/container.plugin.js";
import requestIdPlugin from "./plugins/request-id.plugin.js";
import errorHandlerPlugin from "./plugins/error-handler.plugin.js";
import apiRoutes from "./routes/index.js";

export const API_PREFIX = "/api/v1";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        allErrors: true,
      },
    },
  });

  // Core Infrastructure Plugins
  void app.register(requestIdPlugin);
  void app.register(errorHandlerPlugin);
  void app.register(databasePlugin);
  void app.register(containerPlugin);

  app.register(apiRoutes, { prefix: API_PREFIX });

  // Health check endpoint
  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}

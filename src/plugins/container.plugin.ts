import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { AppContainer, createContainer } from "../container.js";

declare module "fastify" {
  interface FastifyInstance {
    container: AppContainer;
  }
}

/**
 * Builds the DI container after the database pool is available
 * and decorates the Fastify instance with it.
 */
const containerPlugin: FastifyPluginAsync = async (fastify) => {
  const container = createContainer(fastify.db);
  fastify.decorate("container", container);
};

export default fp(containerPlugin, {
  name: "container",
  dependencies: ["database"],
});

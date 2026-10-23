import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";

const requestIdPlugin: FastifyPluginAsync = async (fastify) => {
  // Ensure every response has the x-request-id header matching request.id
  fastify.addHook("onSend", async (request, reply) => {
    void reply.header("x-request-id", request.id);
  });
};

export default fp(requestIdPlugin, {
  name: "request-id",
});

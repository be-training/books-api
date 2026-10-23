import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyError } from "fastify";
import { AppError } from "../common/errors/app-error.js";

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError | AppError | Error, request, reply) => {
    const requestId = request.id;

    // 1. Business & Domain AppError
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined && { details: error.details }),
          requestId,
        },
      });
    }

    // 2. Fastify native Schema Validation Error
    if ("validation" in error && error.validation) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
          details: error.validation,
          requestId,
        },
      });
    }

    // 3. Fastify HTTP Error with statusCode
    if ("statusCode" in error && typeof error.statusCode === "number") {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code ?? "HTTP_ERROR",
          message: error.message,
          requestId,
        },
      });
    }

    // 4. Unexpected 500 Server Error
    request.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An internal server error occurred",
        requestId,
      },
    });
  });

  // Fastify custom 404 handler matching error envelope
  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.id,
      },
    });
  });
};

export default fp(errorHandlerPlugin, {
  name: "error-handler",
});

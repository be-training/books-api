import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyError } from "fastify";
import { AppError } from "../common/errors/app-error.js";
import { ErrorCode } from "../common/errors/error-codes.js";
import { HttpCodes } from "../common/errors/http-codes.js";
import { translateValidationMessage } from "../common/errors/validation-messages.js";

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler(
    (error: FastifyError | AppError | Error, request, reply) => {
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
        const details = error.validation.map(translateValidationMessage);

        return reply.status(HttpCodes.BadRequest).send({
          error: {
            code: ErrorCode.ValidationError,
            message: "Request validation failed",
            details,
            requestId,
          },
        });
      }

      // 3. Fastify HTTP Error with statusCode
      if ("statusCode" in error && typeof error.statusCode === "number") {
        return reply.status(error.statusCode).send({
          error: {
            code: error.code ?? ErrorCode.HttpError,
            message: error.message,
            requestId,
          },
        });
      }

      // 4. Unexpected 500 Server Error
      request.log.error(error);
      return reply.status(HttpCodes.InternalServerError).send({
        error: {
          code: ErrorCode.InternalServerError,
          message: "An internal server error occurred",
          requestId,
        },
      });
    },
  );

  // Fastify custom 404 handler matching error envelope
  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(HttpCodes.NotFound).send({
      error: {
        code: ErrorCode.RouteNotFound,
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.id,
      },
    });
  });
};

export default fp(errorHandlerPlugin, {
  name: "error-handler",
});

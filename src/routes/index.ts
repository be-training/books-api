import type { FastifyPluginAsync } from "fastify";
import bookRoutes from "../modules/books/book.routes.js";

const apiRoutes: FastifyPluginAsync = async (app) => {
  await app.register(bookRoutes);
};

export default apiRoutes;

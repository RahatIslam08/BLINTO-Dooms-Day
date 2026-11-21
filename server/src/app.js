import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import movieRoutes from "./routes/movieRoutes.js";
import cinemaRoutes from "./routes/cinemaRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/movies", movieRoutes);
  app.use("/api/cinemas", cinemaRoutes);

  if (process.env.NODE_ENV === "production") {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const clientDist = path.resolve(here, "../../../client/dist");
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.method === "GET" && req.accepts("html")) {
        return res.sendFile(path.join(clientDist, "index.html"));
      }
      next();
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

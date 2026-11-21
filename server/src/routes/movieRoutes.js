import { Router } from "express";
import {
  createMovie,
  deleteMovie,
  getMovie,
  getRewatchOrder,
  listMovies,
  updateMovie,
} from "../controllers/movieController.js";

const router = Router();

router.route("/").post(createMovie).get(listMovies);
router.route("/:id").get(getMovie).patch(updateMovie).delete(deleteMovie);
router.get("/:id/rewatch-order", getRewatchOrder);

export default router;

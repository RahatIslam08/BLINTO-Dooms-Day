import { Router } from "express";
import {
  createCinema,
  deleteCinema,
  getBooking,
  getCinema,
  listCinemas,
  updateCinema,
} from "../controllers/cinemaController.js";

const router = Router();

router.route("/").post(createCinema).get(listCinemas);
router.route("/:id").get(getCinema).patch(updateCinema).delete(deleteCinema);
router.get("/:id/booking", getBooking);

export default router;

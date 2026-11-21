import Cinema from "../models/Cinema.js";
import { calculateMinimumBundles } from "../services/bundleOptimizer.js";

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export async function createCinema(req, res, next) {
  try {
    const cinema = await Cinema.create(req.body);
    res.status(201).json(cinema);
  } catch (error) {
    next(error);
  }
}

export async function listCinemas(req, res, next) {
  try {
    const cinemas = await Cinema.find().sort({ name: 1 });
    res.json(cinemas);
  } catch (error) {
    next(error);
  }
}

export async function getCinema(req, res, next) {
  try {
    const cinema = await Cinema.findById(req.params.id);
    if (!cinema) throw httpError(404, "NOT_FOUND", "Cinema not found");
    res.json(cinema);
  } catch (error) {
    next(error);
  }
}

export async function updateCinema(req, res, next) {
  try {
    const cinema = await Cinema.findById(req.params.id);
    if (!cinema) throw httpError(404, "NOT_FOUND", "Cinema not found");
    for (const key of ["name", "bundleSizes"]) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        cinema[key] = req.body[key];
      }
    }
    await cinema.save();
    res.json(cinema);
  } catch (error) {
    next(error);
  }
}

export async function deleteCinema(req, res, next) {
  try {
    const cinema = await Cinema.findByIdAndDelete(req.params.id);
    if (!cinema) throw httpError(404, "NOT_FOUND", "Cinema not found");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getBooking(req, res, next) {
  try {
    const cinema = await Cinema.findById(req.params.id);
    if (!cinema) throw httpError(404, "NOT_FOUND", "Cinema not found");
    const groupSize = Number(req.query.groupSize);
    if (!/^\d+$/.test(String(req.query.groupSize))) {
      throw httpError(400, "VALIDATION_ERROR", "groupSize must be an integer");
    }
    const result = calculateMinimumBundles(groupSize, cinema.bundleSizes);
    res.json({
      cinemaId: cinema._id,
      cinemaName: cinema.name,
      groupSize,
      bundleSizes: cinema.bundleSizes,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

import mongoose from "mongoose";
import Movie from "../models/Movie.js";
import { hasCircularDependency, getTopologicalPrerequisites } from "../services/movieGraph.js";

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function validatePrerequisites(prerequisites, excludedId) {
  if (!Array.isArray(prerequisites)) {
    throw httpError(400, "VALIDATION_ERROR", "Prerequisites must be an array");
  }
  if (new Set(prerequisites.map(String)).size !== prerequisites.length) {
    throw httpError(400, "VALIDATION_ERROR", "Prerequisites must not contain duplicates");
  }
  for (const id of prerequisites) {
    if (!mongoose.isValidObjectId(id)) {
      throw httpError(400, "INVALID_ID", "A prerequisite ID is invalid");
    }
  }
  if (excludedId && prerequisites.some((id) => String(id) === String(excludedId))) {
    throw httpError(409, "CIRCULAR_DEPENDENCY", "A movie cannot be its own prerequisite");
  }
  const count = await Movie.countDocuments({ _id: { $in: prerequisites } });
  if (count !== prerequisites.length) {
    throw httpError(400, "VALIDATION_ERROR", "One or more prerequisites do not exist");
  }
}

export async function createMovie(req, res, next) {
  try {
    const prerequisites = req.body.prerequisites || [];
    await validatePrerequisites(prerequisites);
    const provisionalId = new mongoose.Types.ObjectId();
    const movies = await Movie.find().lean();
    if (hasCircularDependency(provisionalId, prerequisites, movies)) {
      throw httpError(409, "CIRCULAR_DEPENDENCY", "Prerequisites cannot contain a circular dependency");
    }
    const movie = await Movie.create({ ...req.body, prerequisites });
    res.status(201).json(movie);
  } catch (error) {
    next(error);
  }
}

export async function listMovies(req, res, next) {
  try {
    const movies = await Movie.find().sort({ title: 1 });
    res.json(movies);
  } catch (error) {
    next(error);
  }
}

export async function getMovie(req, res, next) {
  try {
    const movie = await Movie.findById(req.params.id).populate("prerequisites");
    if (!movie) throw httpError(404, "NOT_FOUND", "Movie not found");
    res.json(movie);
  } catch (error) {
    next(error);
  }
}

export async function updateMovie(req, res, next) {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) throw httpError(404, "NOT_FOUND", "Movie not found");

    const allowed = ["title", "releaseYear", "runtime", "prerequisites", "watched"];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        movie[key] = req.body[key];
      }
    }

    await validatePrerequisites(movie.prerequisites.map(String), movie._id);
    const movies = await Movie.find().lean();
    if (hasCircularDependency(movie._id, movie.prerequisites.map(String), movies)) {
      throw httpError(409, "CIRCULAR_DEPENDENCY", "Prerequisites cannot contain a circular dependency");
    }

    await movie.save();
    res.json(movie);
  } catch (error) {
    next(error);
  }
}

export async function deleteMovie(req, res, next) {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) throw httpError(404, "NOT_FOUND", "Movie not found");
    await Movie.updateMany(
      { prerequisites: movie._id },
      { $pull: { prerequisites: movie._id } }
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getRewatchOrder(req, res, next) {
  try {
    const target = await Movie.findById(req.params.id);
    if (!target) throw httpError(404, "NOT_FOUND", "Movie not found");

    const movies = await Movie.find().lean();
    const ids = getTopologicalPrerequisites(target._id, movies);
    const ordered = await Movie.find({ _id: { $in: ids } });
    const byId = new Map(ordered.map((movie) => [String(movie._id), movie]));
    const prerequisites = ids.map((id) => byId.get(id)).filter(Boolean);
    const watchedCount = prerequisites.filter((movie) => movie.watched).length;
    const remainingRuntime = prerequisites
      .filter((movie) => !movie.watched)
      .reduce((sum, movie) => sum + movie.runtime, 0);

    res.json({
      target: {
        id: target._id,
        title: target.title,
        runtime: target.runtime,
        watched: target.watched,
      },
      prerequisites,
      watchedCount,
      remainingRuntime,
    });
  } catch (error) {
    next(error);
  }
}

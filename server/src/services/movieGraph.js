import mongoose from "mongoose";

export function hasCircularDependency(targetId, proposedPrerequisites, movies) {
  const graph = new Map(movies.map((movie) => [String(movie._id), movie.prerequisites.map(String)]));
  graph.set(String(targetId), proposedPrerequisites.map(String));

  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const prerequisiteId of graph.get(id) || []) {
      if (visit(prerequisiteId)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return visit(String(targetId));
}

export function getTopologicalPrerequisites(targetId, movies) {
  const graph = new Map(movies.map((movie) => [String(movie._id), movie.prerequisites.map(String)]));
  const target = String(targetId);
  const visited = new Set();
  const result = [];

  function visit(id) {
    if (visited.has(id) || id === target) return;
    visited.add(id);
    for (const prerequisiteId of graph.get(id) || []) {
      visit(prerequisiteId);
    }
    result.push(id);
  }

  for (const prerequisiteId of graph.get(target) || []) visit(prerequisiteId);
  return result;
}

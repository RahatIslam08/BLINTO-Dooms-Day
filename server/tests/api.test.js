import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  const connections = await Promise.all([connectDatabase(uri), connectDatabase(uri)]);
  expect(connections[0]).toBe(connections[1]);
  app = createApp();
});

afterAll(async () => {
  await disconnectDatabase();
  await mongo.stop();
});

describe("Blinto API", () => {
  it("creates movies and computes a rewatch order", async () => {
    const base = await request(app).post("/api/movies").send({
      title: "Foundations",
      releaseYear: 2026,
      runtime: 100,
      watched: true,
    });
    expect(base.status).toBe(201);

    const sequel = await request(app).post("/api/movies").send({
      title: "Resistance",
      releaseYear: 2027,
      runtime: 130,
      prerequisites: [base.body._id],
    });
    expect(sequel.status).toBe(201);

    const plan = await request(app).get(`/api/movies/${sequel.body._id}/rewatch-order`);
    expect(plan.status).toBe(200);
    expect(plan.body.prerequisites.map((movie) => movie.title)).toEqual(["Foundations"]);
    expect(plan.body.watchedCount).toBe(1);
    expect(plan.body.remainingRuntime).toBe(0);
  });

  it("rejects indirect circular dependencies", async () => {
    const a = await request(app).post("/api/movies").send({ title: "Cycle A", releaseYear: 2020, runtime: 90 });
    const b = await request(app).post("/api/movies").send({ title: "Cycle B", releaseYear: 2021, runtime: 90, prerequisites: [a.body._id] });
    const response = await request(app).patch(`/api/movies/${a.body._id}`).send({ prerequisites: [b.body._id] });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CIRCULAR_DEPENDENCY");
  });

  it("calculates cinema bundles exactly", async () => {
    const cinema = await request(app).post("/api/cinemas").send({ name: "Central Cinema", bundleSizes: [3, 5] });
    expect(cinema.status).toBe(201);
    const booking = await request(app).get(`/api/cinemas/${cinema.body._id}/booking?groupSize=6`);
    expect(booking.status).toBe(200);
    expect(booking.body.minimumBundles).toBe(2);
  });
});

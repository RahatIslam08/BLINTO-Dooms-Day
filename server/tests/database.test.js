import { describe, expect, it } from "vitest";
import { connectDatabase } from "../src/config/database.js";

describe("database configuration", () => {
  it("requires a configured MongoDB URI", async () => {
    await expect(connectDatabase("")).rejects.toThrow("MONGODB_URI is required");
  });

  it("rejects an unfilled URI template", async () => {
    await expect(
      connectDatabase("mongodb+srv://user:<PASSWORD>@example.mongodb.net/db")
    ).rejects.toThrow("still contains a placeholder");
  });
});

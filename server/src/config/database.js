import mongoose from "mongoose";

let connectionPromise;

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    const error = new Error("MONGODB_URI is required; configure the server environment before starting.");
    error.code = "MONGODB_URI_MISSING";
    throw error;
  }
  if (uri.includes("<") || uri.includes(">") || uri.includes("YOUR_URL_ENCODED_PASSWORD")) {
    const error = new Error("MONGODB_URI still contains a placeholder; configure Atlas credentials before starting.");
    error.code = "MONGODB_URI_PLACEHOLDER";
    throw error;
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
      console.log(`MongoDB connected to database "${mongoose.connection.name}".`);
      return mongoose.connection;
    })
    .finally(() => {
      connectionPromise = undefined;
    });

  return connectionPromise;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  console.log("MongoDB connection closed.");
}

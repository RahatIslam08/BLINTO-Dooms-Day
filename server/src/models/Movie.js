import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    releaseYear: {
      type: Number,
      required: [true, "Release year is required"],
      integer: true,
      min: [1888, "Release year must be 1888 or later"],
      max: [2100, "Release year must be 2100 or earlier"],
    },
    runtime: {
      type: Number,
      required: [true, "Runtime is required"],
      integer: true,
      min: [1, "Runtime must be between 1 and 300 minutes"],
      max: [300, "Runtime must be between 1 and 300 minutes"],
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Movie",
      },
    ],
    watched: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

movieSchema.index({ title: 1 }, { unique: true });

export default mongoose.model("Movie", movieSchema);

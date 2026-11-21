import mongoose from "mongoose";

const cinemaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Cinema name is required"],
      trim: true,
    },
    bundleSizes: {
      type: [Number],
      required: [true, "At least one bundle size is required"],
      validate: {
        validator: (sizes) =>
          sizes.length > 0 &&
          sizes.length <= 10 &&
          new Set(sizes).size === sizes.length &&
          sizes.every((size) => Number.isInteger(size) && size >= 1 && size <= 500),
        message: "Bundle sizes must be 1–500, unique, and limited to 10 values",
      },
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

cinemaSchema.index({ name: 1 }, { unique: true });

export default mongoose.model("Cinema", cinemaSchema);

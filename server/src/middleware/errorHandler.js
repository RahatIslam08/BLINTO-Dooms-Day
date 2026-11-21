export function notFound(req, res, next) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found" } });
}

export function errorHandler(error, req, res, next) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    return res.status(409).json({
      error: {
        code: `DUPLICATE_${field.toUpperCase()}`,
        message: `${field[0].toUpperCase() + field.slice(1)} must be unique`,
      },
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: Object.values(error.errors).map((item) => item.message).join("; "),
      },
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      error: { code: "INVALID_ID", message: "Invalid resource ID" },
    });
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Unhandled API error:", error.name || "Error", error.code || "UNKNOWN");
  } else {
    console.error(error);
  }
  res.status(error.status || 500).json({
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.status ? error.message : "An unexpected error occurred",
    },
  });
}

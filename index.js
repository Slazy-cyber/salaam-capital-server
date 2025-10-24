const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads")); // Serve uploaded images

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Unified Routes (all in one)
// Mount user routes under both /api and /api/users so older frontend paths
// like /api/login or /api/me continue to work while newer paths
// like /api/users/me also resolve.
app.use("/api", require("./routes/userRoute"));
app.use("/api/users", require("./routes/userRoute")); // ✅ Only one routes file now

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

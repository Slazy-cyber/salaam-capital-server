const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  accountNumber: { type: Number, unique: true, required: true },
  balance: { type: Number, default: 1000 },
  ProfilerPic: { type: String, default: "" },
});

module.exports = mongoose.model("User", userSchema);
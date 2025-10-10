const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  email: { type: String, unique: true },
  password: String,
  accountNumber: String,
  balance: { type: Number, default: 100000 },
  profilePic: { type: String, default: "" },
});

module.exports = mongoose.model("User", userSchema);

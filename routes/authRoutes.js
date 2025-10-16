const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

router.post("/signup", async (req, res) => {
  console.log("Received signup request:", req.body);
  if (!req.body) {
    return res.status(400).json({ msg: "Request body is missing" });
  }
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    let accountNumber;
    let isUnique = false;
    while (!isUnique) {
      accountNumber = Math.floor(1000000000 + Math.random() * 9000000000);
      const existingUser = await User.findOne({ accountNumber });
      if (!existingUser) isUnique = true;
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashed,
      accountNumber,
    });

    const { password: _, ...userData } = newUser._doc || newUser;
    res.status(201).json({ msg: "Signup successful", user: userData });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});


router.post("/login", async (req, res) => {
  console.log("Received login request:", req.body);
  if (!req.body) {
    return res.status(400).json({ msg: "Request body is missing" });
  }

  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ msg: "Email and password are required" });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ msg: "Invalid email format" });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Incorrect password" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Exclude password from response
    const { password: _, ...userData } = user._doc || user;

    res.status(200).json({
      msg: "Login successful",
      user: userData,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router;

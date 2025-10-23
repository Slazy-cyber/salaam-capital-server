const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// ============================
// 💰 TRANSACTION ROUTES
// ============================

router.get("/transactions", auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// ============================
// 📦 AUTH ROUTES (Signup + Login)
// ============================

router.post("/signup", async (req, res) => {
  console.log("Received signup request:", req.body);
  if (!req.body) return res.status(400).json({ msg: "Request body is missing" });

  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ msg: "All fields are required" });

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    // Generate unique 10-digit account number
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
  if (!req.body) return res.status(400).json({ msg: "Request body is missing" });

  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ msg: "Email and password are required" });

  if (!/\S+@\S+\.\S+/.test(email))
    return res.status(400).json({ msg: "Invalid email format" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Incorrect password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

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


// ============================
// 👤 USER ROUTES (/me, /update, /upload)
// ============================

// Multer setup for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password");
    res.json(user);
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ msg: "Failed to get user data" });
  }
});

router.put("/update", auth, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    await user.save();

    res.json({ msg: "Profile updated", user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/upload", auth, upload.single("profilePic"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const user = await User.findById(req.user);
    user.profilePic = req.file.path;
    await user.save();

    res.json({ msg: "Profile picture updated", path: req.file.path });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


// ============================
// 💸 TRANSACTION ROUTES (Transfer, Airtime, History)
// ============================

router.post("/transfer", auth, async (req, res) => {
  try {
    const { recipientAccount, amount } = req.body;
    const sender = await User.findById(req.user);
    const receiver = await User.findOne({ accountNumber: recipientAccount });

    if (!receiver) return res.status(400).json({ msg: "Recipient not found" });
    if (sender.balance < amount)
      return res.status(400).json({ msg: "Insufficient funds" });

    sender.balance -= amount;
    receiver.balance += Number(amount);
    await sender.save();
    await receiver.save();

    await Transaction.create({
      userId: sender._id,
      type: "transfer",
      amount,
      description: `Transfer to ${recipientAccount}`,
    });

    await Transaction.create({
      userId: receiver._id,
      type: "transfer",
      amount,
      description: `Received from ${sender.accountNumber}`,
    });

    res.json({ msg: "Transfer successful" });
  } catch (err) {
    console.error("Transfer error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


router.post("/airtime", auth, async (req, res) => {
  try {
    const { amount, network } = req.body;
    const user = await User.findById(req.user);

    if (user.balance < amount)
      return res.status(400).json({ msg: "Insufficient balance" });

    user.balance -= amount;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: "airtime",
      amount,
      description: `Airtime purchase (${network})`,
    });

    res.json({ msg: "Airtime purchased successfully" });
  } catch (err) {
    console.error("Airtime error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


router.get("/history", auth, async (req, res) => {
  try {
    const history = await Transaction.find({ userId: req.user }).sort({ date: -1 });
    res.json(history);
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


// ============================
// 🚀 EXPORT ROUTER
// ============================
module.exports = router;

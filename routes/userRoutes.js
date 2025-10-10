const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const router = express.Router();


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});
const upload = multer({ storage });

router.get("/me", auth, async (req, res) => {
    const user = await User.findById(req.user).select("-password");
    res.json(user);
});


router.put("/update", auth, async (req, res) => {
    const { firstname, lastname, email } = req.body;
    const user = await User.findById(req.user);
    user.firstname = firstname || user.firstname;
    user.lastname = lastname || user.lastname;
    user.email = email || user.email;
    await user.save();
    res.json({ msg: "Profile updated", user });
});

router.post("/upload", auth, upload.single("profilePic"), async (req, res) => {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const user = await User.findById(req.user);
    user.profilePic = req.file.path;
    await user.save();

    res.json({ msg: "Profile picture updated", path: req.file.path });
});

module.exports = router;

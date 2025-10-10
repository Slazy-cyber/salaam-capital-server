const express = require("express");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/transfer", auth, async (req, res) => {
  const { recipientAccount, amount } = req.body;

  const sender = await User.findById(req.user);
  const receiver = await User.findOne({ accountNumber: recipientAccount });

  if (!receiver) return res.status(400).json({ msg: "Recipient not found" });
  if (sender.balance < amount) return res.status(400).json({ msg: "Insufficient funds" });

  sender.balance -= amount;
  receiver.balance += Number(amount);
  await sender.save();
  await receiver.save();

  await Transaction.create({ userId: sender._id, type: "transfer", amount, description: `Transfer to ${recipientAccount}` });
  await Transaction.create({ userId: receiver._id, type: "transfer", amount, description: `Received from ${sender.accountNumber}` });

  res.json({ msg: "Transfer successful" });
});

router.post("/airtime", auth, async (req, res) => {
  const { amount, network } = req.body;
  const user = await User.findById(req.user);

  if (user.balance < amount) return res.status(400).json({ msg: "Insufficient balance" });

  user.balance -= amount;
  await user.save();

  await Transaction.create({ userId: user._id, type: "airtime", amount, description: `Airtime purchase (${network})` });

  res.json({ msg: "Airtime purchased successfully" });
});

router.get("/history", auth, async (req, res) => {
  const history = await Transaction.find({ userId: req.user }).sort({ date: -1 });
  res.json(history);
});

module.exports = router;

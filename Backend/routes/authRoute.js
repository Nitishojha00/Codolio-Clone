const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const generateOTP = require("../utils/generateOTP");
const checkOtpRateLimit = require("../utils/otpRateLimit");
const jwt = require("jsonwebtoken");
const router = express.Router();

/* TEMP OTP STORE (simple testing) */
let pendingSignup = null;

/* ================= SIGNUP : GENERATE OTP ================= */
const redis = require("../config/redis");
const crypto = require("crypto");

router.post("/signup-generate-otp", async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).send("User already registered");

  /* ================= RATE LIMIT (ATOMIC & SAFE) ================= */
  const limitKey = `otp_limit:${email}`;

  const count = await redis.incr(limitKey); // 🔒 atomic

  if (count === 1) {
    await redis.expire(limitKey, 3 * 60 * 60); // 3 hours
  }

  if (count > 3) {
    return res
      .status(429)
      .send("OTP limit exceeded. Try again after 3 hours.");
  }

  /* ================= OTP GENERATION ================= */
  const otp = generateOTP();
  const hashedPassword = await bcrypt.hash(password, 10);
  const signupId = crypto.randomUUID();

  /* ================= STORE TEMP DATA ================= */
  await redis.set(
    `signup:${signupId}`,
    JSON.stringify({
      name,
      email,
      password: hashedPassword,
      otp
    }),
    { EX: 120 } // 2 minutes
  );

  /* ================= SEND EMAIL ================= */
  await sendEmail(email, otp);

  res.json({
    message: "OTP sent",
    signupId
  });
});



const cookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 1000, // 1 hour
  sameSite: "lax",        // ✅ works on localhost
  secure: false,         // ✅ MUST be false on http://localhost
  domain: "127.0.0.1",
  path: "/"
};

/* ================= SIGNUP : VERIFY OTP ================= */
router.post("/signup-verify-otp", async (req, res) => {
  const { signupId, otp } = req.body;

  const data = await redis.get(`signup:${signupId}`);
  if (!data) {
    return res.status(400).send("OTP expired");
  }

  const parsed = JSON.parse(data);

  if (parsed.otp !== otp) {
    return res.status(400).send("Invalid OTP");
  }
  
  // console.log(parsed.name);
  const user = await User.create({
    name: parsed.name,
    email: parsed.email,
    password: parsed.password
  });

  // delete redis entry after success
  await redis.del(`signup:${signupId}`);

  const token = jwt.sign(
        { _id: user._id, email: user.email },
        process.env.JWT_KEY,
        { expiresIn: "1h" }
      );
  res.cookie("token", token, cookieOptions);
  res.send("Signup successful");
});


/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // console.log(1);
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("User not found");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).send("Wrong password");

  const token = jwt.sign(
        { _id: user._id, email },
        process.env.JWT_KEY,
        { expiresIn: "1h" }
      );
  
  res.cookie("token", token, cookieOptions);
  res.send("Login successful");
});

module.exports = router;


// update name bro
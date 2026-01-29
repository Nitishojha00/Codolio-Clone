const express = require("express");
const router = express.Router();
const {LOGIN , signUpGenerateOTP , signUpVerifyOTP} = require("../controllers/authController")

/* ================= SIGNUP : GENERATE OTP ================= */

router.post("/signup-generate-otp", signUpGenerateOTP);

/* ================= SIGNUP : VERIFY OTP ================= */
router.post("/signup-verify-otp", signUpVerifyOTP);

/* ================= LOGIN ================= */
router.post("/login", LOGIN)

module.exports = router;


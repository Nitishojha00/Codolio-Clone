const redisClient = require("../config/redis");
const User = require("../models/user");
const validate = require("../utils/validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* ================= COOKIE OPTIONS ================= */
const cookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 1000, // 1 hour
  sameSite: "lax",        // ✅ works on localhost
  secure: false,          // ✅ MUST be false on http://localhost
  path: "/"
};

/* ================= REGISTER ================= */
const register = async (req, res) => {
  try {
    validate(req.body);

    const { emailId, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      emailId,
      password: hashedPassword
    });

    const token = jwt.sign(
      { _id: user._id, emailId },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, cookieOptions);

    res.status(201).json({
      user: { emailId: user.emailId },
      message: "Registered Successfully"
    });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/* ================= LOGIN ================= */
const login = async (req, res) => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password)
      throw new Error("Invalid Credentials");

    // 🔥 VERY IMPORTANT: select password explicitly
    const user = await User.findOne({ emailId }).select("+password");
    if (!user) throw new Error("Invalid Credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid Credentials");

    const token = jwt.sign(
      { _id: user._id, emailId },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, cookieOptions);

    res.status(200).json({
      user: { emailId: user.emailId, _id: user._id },
      message: "Login Successful"
    });

  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

/* ================= LOGOUT ================= */
const logout = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(200).json({ message: "Logged out" });

    const payload = jwt.verify(token, process.env.JWT_KEY);

    // blacklist token
    await redisClient.set(`token:${token}`, "blocked");
    await redisClient.expireAt(`token:${token}`, payload.exp);

    res.clearCookie("token", { path: "/" });

    res.status(200).json({ message: "Logged out successfully" });

  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { register, login, logout };

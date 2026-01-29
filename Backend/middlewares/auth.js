const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");

module.exports = async (req, res, next) => {
  try {
    // console.log("request reached")
    // console.log("AUTH HEADER:", req.headers.authorization); // 👈 DEBUG
    const token = req.cookies.token;
    // console.log(token);
    if (!token) throw new Error("No token");

    const isBlocked = await redisClient.get(`token:${token}`);
    if (isBlocked) throw new Error("Token blocked");

    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.userId = decoded._id;
    req.email = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

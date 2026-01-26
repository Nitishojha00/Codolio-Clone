const redis = require("../config/redis");

const OTP_LIMIT = 3;
const WINDOW_SECONDS = 3 * 60 * 60; // 3 hours

async function checkOtpRateLimit(email) {
  const key = `otp:rate:${email}`;

  const count = await redis.get(key);

  if (count && Number(count) >= OTP_LIMIT) {
    return false; // ❌ limit exceeded
  }

  if (!count) {
    // first request
    await redis.set(key, 1, { EX: WINDOW_SECONDS });
  } else {
    await redis.incr(key);
  }

  return true; // ✅ allowed
}

module.exports = checkOtpRateLimit;

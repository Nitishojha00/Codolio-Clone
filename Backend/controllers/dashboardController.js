const User = require("../models/User");
const redisClient = require("../config/redis");
const fetchLeetCode = require("../utils/leetcode");
const fetchCodeforces = require("../utils/codeforces");
const fetchCodeChef = require("../utils/codechef");
const fetchGFG = require("../utils/gfg");

/* ================= CONSTANTS ================= */
const REFRESH_THRESHOLD = 1800; // 30 min
const CACHE_TTL = 86400;        // 24 hours
const LOCK_TTL = 60;            // 60 sec

/* ================= HELPER: SCRAPER LOGIC ================= */
async function fetchRealTimeStats(platforms) {
  const stats = JSON.parse(JSON.stringify(platforms));
  const tasks = [];

  if (stats.LeetCode?.username) {
    tasks.push(
      fetchLeetCode(stats.LeetCode.username)
        .then(res => Object.assign(stats.LeetCode, res))
        .catch(err => console.error("LeetCode Error:", err.message))
    );
  }

  if (stats.Codeforces?.username) {
    tasks.push(
      fetchCodeforces(stats.Codeforces.username)
        .then(res => Object.assign(stats.Codeforces, res))
        .catch(err => console.error("Codeforces Error:", err.message))
    );
  }

  if (stats.CodeChef?.username) {
    tasks.push(
      fetchCodeChef(stats.CodeChef.username)
        .then(res => {
          stats.CodeChef.solved = res.solved || 0;
          stats.CodeChef.rating = res.rating || 0;
        })
        .catch(err => console.error("CodeChef Error:", err.message))
    );
  }

  if (stats.GFG?.username) {
    tasks.push(
      fetchGFG(stats.GFG.username)
        .then(res => Object.assign(stats.GFG, res))
        .catch(err => console.error("GFG Error:", err.message))
    );
  }

  await Promise.allSettled(tasks);
  return stats;
}

/* ================= HELPER: AGGREGATION ================= */
function buildDashboardResponse(platforms) {
  let totalSolved = 0;
  let totalContests = 0;
  let bestRating = 0;
  let count = 0;

  for (let key in platforms) {
    const p = platforms[key];
    if (p && p.username) {
      count++;
      totalSolved += Number(p.solved || 0);
      totalContests += Number(p.contests || 0);
      const r = Number(p.rating || 0);
      if (!isNaN(r)) bestRating = Math.max(bestRating, r);
    }
  }

  return {
    platforms,
    totalSolved,
    totalContests,
    bestRating,
    platformCount: count
  };
}

/* ================= BACKGROUND REFRESH ================= */
async function refreshDashboard(userId, dataKey, timeKey, lockKey) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const livePlatforms = await fetchRealTimeStats(user.platforms);
    const responseData = buildDashboardResponse(livePlatforms);

    await redisClient.set(
      dataKey,
      JSON.stringify(responseData),
      { EX: CACHE_TTL }
    );

    await redisClient.set(
      timeKey,
      String(Date.now()),      // 🔥 FIX: number → string
      { EX: CACHE_TTL }
    );

  } catch (err) {
    console.error("Dashboard refresh failed:", err);
  } finally {
    await redisClient.del(lockKey);
  }
}

/* ================= CONTROLLERS ================= */

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

const saveAccounts = async (req, res) => {
  try {
    const { platforms } = req.body;
    await User.findByIdAndUpdate(req.userId, { platforms }, { new: true });

    // Clear dashboard cache
    await redisClient.del(`dashboard:data:${req.userId}`);
    await redisClient.del(`dashboard:time:${req.userId}`);

    res.json({ message: "Saved" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

const getDashboard = async (req, res) => {
  try {
    const userId = req.userId;

    const dataKey = `dashboard:data:${userId}`;
    const timeKey = `dashboard:time:${userId}`;
    const lockKey = `dashboard:lock:${userId}`;

    const cachedData = await redisClient.get(dataKey);
    const lastFetch = await redisClient.get(timeKey);
    const now = Date.now();

    /* ===== CACHE HIT ===== */
    if (cachedData) {
      res.json(JSON.parse(cachedData));

      if (
        !lastFetch ||
        (now - Number(lastFetch)) > (REFRESH_THRESHOLD * 1000)
      ) {
        const lock = await redisClient.set(
          lockKey,
          "1",
          { NX: true, EX: LOCK_TTL }
        );

        if (lock) {
          refreshDashboard(userId, dataKey, timeKey, lockKey);
        }
      }
      return;
    }

    /* ===== CACHE MISS ===== */
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const livePlatforms = await fetchRealTimeStats(user.platforms);
    const responseData = buildDashboardResponse(livePlatforms);

    await redisClient.set(
      dataKey,
      JSON.stringify(responseData),
      { EX: CACHE_TTL }
    );

    await redisClient.set(
      timeKey,
      String(Date.now()),     // 🔥 FIX
      { EX: CACHE_TTL }
    );

    res.json(responseData);

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= EXPORTS ================= */
module.exports = {
  getMe,
  saveAccounts,
  getDashboard
};

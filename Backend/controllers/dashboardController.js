const User = require("../models/user");

const fetchLeetCode = require("../utils/leetcode");
const fetchCodeforces = require("../utils/codeforces");
const fetchCodeChef = require("../utils/codechef");
const fetchGFG = require("../utils/gfg");

/* ================= HELPER ================= */
async function fetchRealTimeStats(platforms) {
  const stats = JSON.parse(JSON.stringify(platforms));
  const tasks = [];

  if (stats.LeetCode?.username) {
    tasks.push(
      fetchLeetCode(stats.LeetCode.username)
        .then(res => Object.assign(stats.LeetCode, res))
    );
  }

  if (stats.Codeforces?.username) {
    tasks.push(
      fetchCodeforces(stats.Codeforces.username)
        .then(res => Object.assign(stats.Codeforces, res))
    );
  }

    if (stats.CodeChef && stats.CodeChef.username) {
    tasks.push(
      fetchCodeChef(stats.CodeChef.username).then(res => {
        stats.CodeChef.solved = res.solved;
        stats.CodeChef.rating = res.rating;
      })
    );
  }

  if (stats.GFG?.username) {
    tasks.push(
      fetchGFG(stats.GFG.username)
        .then(res => Object.assign(stats.GFG, res))
    );
  }

  await Promise.allSettled(tasks);
  return stats;
}

/* ================= CONTROLLERS ================= */
const getMe = async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  res.json(user);
};

const saveAccounts = async (req, res) => {
  const { platforms } = req.body;
  await User.findByIdAndUpdate(req.userId, { platforms }, { new: true });
  res.json({ message: "Saved" });
};

const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const livePlatforms = await fetchRealTimeStats(user.platforms);

    let totalSolved = 0, totalContests = 0, bestRating = 0, count = 0;

    for (let key in livePlatforms) {
      const p = livePlatforms[key];
      if (p && p.username) {
        count++;
        totalSolved += Number(p.solved || 0);
        totalContests += Number(p.contests || 0);
        const r = Number(p.rating || 0);
        if (!isNaN(r)) bestRating = Math.max(bestRating, r);
      }
    }

    res.json({
      platforms: livePlatforms,
      totalSolved,
      totalContests,
      bestRating,
      platformCount: count
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= EXPORTS ================= */
module.exports = {
  getMe,
  saveAccounts,
  getDashboard,
  fetchRealTimeStats
};

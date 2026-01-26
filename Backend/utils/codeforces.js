const axios = require("axios");

async function fetchCodeforces(username) {
  const result = { solved: 0, rating: 0, rank: 0 };

  try {
    const info = await axios.get(
      `https://codeforces.com/api/user.info?handles=${username}`
    );

    if (info.data.status === "OK") {
      result.rating = info.data.result[0].rating || 0;
      result.rank = info.data.result[0].maxRank || 0;
    }

    const status = await axios.get(
      `https://codeforces.com/api/user.status?handle=${username}`
    );

    if (status.data.status === "OK") {
      const solvedSet = new Set();
      status.data.result.forEach(x => {
        if (x.verdict === "OK") {
          solvedSet.add(`${x.problem.contestId}-${x.problem.index}`);
        }
      });
      result.solved = solvedSet.size;
    }
  } catch {
    console.log("❌ Codeforces fetch failed");
  }

  return result;
}

module.exports = fetchCodeforces;

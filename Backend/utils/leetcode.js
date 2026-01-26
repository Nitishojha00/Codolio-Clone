const axios = require("../config/axiosConfig");

async function fetchLeetCode(username) {
  const result = { solved: 0, rating: 0, rank: 0, contests: 0 };

  try {
    const query = {
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum {
                count
              }
            }
          }
          userContestRanking(username: $username) {
            rating
            globalRanking
            attendedContestsCount
          }
        }
      `,
      variables: { username }
    };

    const res = await axios.post(
      "https://leetcode.com/graphql",
      query,
      { headers: { "Content-Type": "application/json" } }
    );

    const data = res.data?.data;
    if (!data?.matchedUser) return result;

    result.solved = data.matchedUser.submitStatsGlobal.acSubmissionNum[0]?.count || 0;

    const contest = data.userContestRanking;
    result.rating = Math.floor(contest?.rating || 0);
    result.rank = contest?.globalRanking || 0;
    result.contests = contest?.attendedContestsCount || 0;

  } catch (err) {
    console.log("❌ LeetCode fetch failed:", err.message);
  }

  return result;
}

module.exports = fetchLeetCode;

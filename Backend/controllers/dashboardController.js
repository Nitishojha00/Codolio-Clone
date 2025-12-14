const User = require("../models/user");
const axios = require("axios");
const cheerio = require("cheerio");

/* ================= CONFIG: HEADERS ================= */
// Essential to look like a real PC browser
const AXIOS_CONFIG = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/'
  }
};

/* ================= HELPER: FETCH REAL-TIME STATS ================= */
const fetchRealTimeStats = async (platforms) => {
  const stats = JSON.parse(JSON.stringify(platforms));
  const promises = [];

  // =========================================================================
  // 1. LEETCODE (Retry Enabled)
  // =========================================================================
  if (stats.LeetCode && stats.LeetCode.username) {
    const user = stats.LeetCode.username;
    console.log(`🔍 LEETCODE: Fetching for ${user}...`);
    const fetchLC = async (retries = 1) => {
      try {
        const res = await axios.get(`https://alfa-leetcode-api.onrender.com/${user}/solved`);
        stats.LeetCode.solved = res.data.solvedProblem || 0;
        try {
          const cRes = await axios.get(`https://alfa-leetcode-api.onrender.com/${user}/contest`);
          stats.LeetCode.rating = Math.round(cRes.data.contestRating || 0);
          stats.LeetCode.rank = cRes.data.contestGlobalRanking || 0;
          stats.LeetCode.contests = cRes.data.contestParticipation?.length || 0;
        } catch (e) { stats.LeetCode.rating = 0; }
        console.log(`✅ LEETCODE: Solved ${stats.LeetCode.solved}`);
      } catch (err) {
        if(retries > 0) {
           await new Promise(r => setTimeout(r, 2000));
           return fetchLC(retries - 1);
        }
        console.log(`❌ LEETCODE FAILED`);
      }
    };
    promises.push(fetchLC());
  }

  // =========================================================================
  // 2. CODEFORCES (Working)
  // =========================================================================
  if (stats.Codeforces && stats.Codeforces.username) {
    const user = stats.Codeforces.username;
    console.log(`🔍 CODEFORCES: Fetching for ${user}...`);
    const cfPromise = async () => {
      try {
        const info = await axios.get(`https://codeforces.com/api/user.info?handles=${user}`);
        if(info.data.status === "OK") {
            stats.Codeforces.rating = info.data.result[0].rating || 0;
            stats.Codeforces.rank = info.data.result[0].maxRank || 0;
        }
        const status = await axios.get(`https://codeforces.com/api/user.status?handle=${user}`);
        if(status.data.status === "OK") {
            const s = new Set();
            status.data.result.forEach(x => { if(x.verdict==="OK") s.add(`${x.problem.contestId}-${x.problem.index}`); });
            stats.Codeforces.solved = s.size;
        }
        console.log(`✅ CODEFORCES: Solved ${stats.Codeforces.solved}`);
      } catch(e) { console.log(`❌ CODEFORCES FAILED`); }
    };
    promises.push(cfPromise());
  }

  // =========================================================================
  // 3. CODECHEF (Working)
  // =========================================================================
  if (stats.CodeChef && stats.CodeChef.username) {
    const user = stats.CodeChef.username;
    console.log(`🔍 CODECHEF: Scraping for ${user}...`);
    promises.push(
      axios.get(`https://www.codechef.com/users/${user}`, AXIOS_CONFIG)
        .then(res => {
          const $ = cheerio.load(res.data);
          stats.CodeChef.rating = parseInt($(".rating-number").text()) || 0;
          const match = $.text().match(/Total Problems Solved:\s*(\d+)/i) || $.text().match(/Fully Solved \((\d+)\)/);
          if(match) stats.CodeChef.solved = parseInt(match[1]);
          console.log(`✅ CODECHEF: Solved ${stats.CodeChef.solved}`);
        })
        .catch(e => console.log(`❌ CODECHEF FAILED`))
    );
  }

  // =========================================================================
  // 4. GEEKSFORGEEKS (🔥 FINAL FIX: NEXT.JS DATA EXTRACTION)
  // =========================================================================
  if (stats.GFG && stats.GFG.username) {
    const user = stats.GFG.username;
    // We fetch the main user page. The 'activity' data is embedded in this page's script tags.
    const url = `https://www.geeksforgeeks.org/user/${user}/`; 
    console.log(`🔍 GFG: Fetching Page for ${user}...`);

    promises.push(
      axios.get(url, AXIOS_CONFIG)
        .then(res => {
            const $ = cheerio.load(res.data);
            
            // 🛑 STRATEGY: Get the raw JSON data that GFG uses to render the page
            const nextData = $("#__NEXT_DATA__").html();

            if (nextData) {
               // We convert the whole JSON object to a string so we can search it
               // This finds the data NO MATTER WHERE it is hidden in the object structure
               const dataString = nextData.toString();
               
               // Regex to find "total_problems_solved": 500
               const solvedMatch = dataString.match(/"total_problems_solved"\s*:\s*(\d+)/);
               // Regex to find "pod_solved": 100 (often used as score/rating proxy)
               const scoreMatch = dataString.match(/"pod_solved"\s*:\s*(\d+)/) || dataString.match(/"score"\s*:\s*(\d+)/);

               if (solvedMatch) {
                 stats.GFG.solved = parseInt(solvedMatch[1]);
                 stats.GFG.rating = scoreMatch ? parseInt(scoreMatch[1]) : 0;
                 console.log(`✅ GFG (Deep JSON): Solved ${stats.GFG.solved}`);
                 return; // Success!
               }
            }

            // FALLBACK: If JSON method fails, scan the visual text of the page
            const pageText = $("body").text();
            // Look for "Problem Solved : 123"
            const textMatch = pageText.match(/Problem\s*Solved\s*[:\-|]?\s*(\d+)/i);
            
            if (textMatch) {
                stats.GFG.solved = parseInt(textMatch[1]);
                console.log(`✅ GFG (Text Scan): Solved ${stats.GFG.solved}`);
            } else {
                console.log(`❌ GFG FAILED: Data not found in page source.`);
            }
        })
        .catch(err => {
            // 404 means the user profile URL is wrong or GFG is blocking the IP
            console.log(`❌ GFG NETWORK ERROR: ${err.message}`);
            stats.GFG.solved = 0;
        })
    );
  }

  await Promise.all(promises);
  return stats;
};

/* ================= API CONTROLLERS ================= */
exports.getMe = async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  res.json(user);
};

exports.saveAccounts = async (req, res) => {
  const { platforms } = req.body;
  const user = await User.findByIdAndUpdate(req.userId, { platforms }, { new: true });
  const livePlatforms = await fetchRealTimeStats(user.platforms);
  res.json({ message: "Saved", platforms: livePlatforms });
};

exports.getDashboard = async (req, res) => {
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
        let r = Number(p.rating || 0);
        if(!isNaN(r)) bestRating = Math.max(bestRating, r);
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
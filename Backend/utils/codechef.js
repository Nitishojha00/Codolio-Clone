const axios = require("axios");
const cheerio = require("cheerio");

async function fetchCodeChef(user) {
  const result = { solved: 0, rating: 0 };

  try {
    console.log(`🔍 CODECHEF: Scraping for ${user}...`);

    const res = await axios.get(
      `https://www.codechef.com/users/${user}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.google.com/",
          "Connection": "keep-alive",
        },
        timeout: 10000,
      }
    );

    const $ = cheerio.load(res.data);

    // SAME WORKING LOGIC
    result.rating = parseInt($(".rating-number").text()) || 0;

    const match =
      $.text().match(/Total Problems Solved:\s*(\d+)/i) ||
      $.text().match(/Fully Solved \((\d+)\)/i);

    if (match) result.solved = parseInt(match[1]);

    console.log(`✅ CODECHEF: Solved ${result.solved}, Rating ${result.rating}`);
  } catch (e) {
    console.log("❌ CODECHEF FAILED");
  }

  return result;
}

module.exports = fetchCodeChef;

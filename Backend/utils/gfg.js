const axios = require("../config/axiosConfig");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

let browserPromise;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserPromise;
}

async function fetchGFG(username) {
  const result = { solved: 0, rating: 0 };
  const url = `https://www.geeksforgeeks.org/profile/${username}/?tab=activity`;

  console.log(`🔍 GFG: Attempting for ${username}...`);

  /* ================= STRATEGY 1: PUPPETEER (PRIMARY) ================= */
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0"
    );

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector("body", { timeout: 10000 });

    const pageText = await page.evaluate(() => document.body.innerText);

    const solvedMatch = pageText.match(/Problems\s*Solved\s*(\d+)/i);
    const scoreMatch = pageText.match(/Coding\s*Score\s*(\d+)/i);

    if (solvedMatch) result.solved = parseInt(solvedMatch[1]);
    if (scoreMatch) result.rating = parseInt(scoreMatch[1]);

    await page.close();

    if (result.solved > 0) {
      console.log(`✅ GFG (Puppeteer): Solved ${result.solved}`);
      return result;
    }
  } catch (err) {
    console.log("⚠️ GFG Puppeteer failed, trying axios fallback...");
  }

  /* ================= STRATEGY 2: AXIOS FALLBACK ================= */
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const text = $("body").text();

    const solvedMatch = text.match(/Problems\s*Solved\s*(\d+)/i);
    const scoreMatch = text.match(/Coding\s*Score\s*(\d+)/i);

    if (solvedMatch) result.solved = parseInt(solvedMatch[1]);
    if (scoreMatch) result.rating = parseInt(scoreMatch[1]);

    if (result.solved > 0) {
      console.log(`✅ GFG (Axios): Solved ${result.solved}`);
    }
  } catch {
    console.log("❌ GFG Axios fallback failed");
  }

  return result;
}

module.exports = fetchGFG;

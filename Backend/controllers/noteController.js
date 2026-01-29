const mongoose = require("mongoose");
const Note = require("../models/Note");
const redisClient = require("../config/redis"); // Ensure path is correct

/* ==================================================
   🔥 HELPER: SAFE NOTES CACHE INVALIDATION
   
   Fixes the "TypeError": uses spread syntax (...)
   Logic: Matches "notes:all", "notes:importance", "note:single"
   Result: ONE function clears EVERYTHING for that user.
================================================== */
const clearUserCache = async (userId) => {
  try {
    if (!userId) return;

    // 1. Find all keys related to this user's notes
    // Pattern "note*:" catches "notes:all:...", "notes:importance:...", "note:..."
    const iterator = redisClient.scanIterator({
      MATCH: `note*:${userId}:*`,
      COUNT: 100
    });

    const keysToDelete = [];
    
    for await (const key of iterator) {
      keysToDelete.push(key);
    }

    // 2. Delete keys safely
    if (keysToDelete.length > 0) {
      // 🔴 FIX: Use spread syntax (...) to prevent "got object instead of string" error
      await redisClient.del(...keysToDelete);
      // console.log(`🧹 Cleared ${keysToDelete.length} keys for User ${userId}`);
    }
  } catch (err) {
    console.error("Redis Clear Error:", err);
  }
};

/* ==================================================
   🧠 HELPER: FETCH & CACHE (Reusable)
   Use this for both "All Problems" and "Importance"
================================================== */
async function fetchAndCacheNotes(query, userId, page, limit, cacheKey) {
  const skip = (page - 1) * limit;

  // Parallel Fetch: Get Data + Count at the same time
  const [notes, total] = await Promise.all([
    Note.find(query)
      .sort({ problemId: 1 }) // Or sort by importance if needed
      .select("problemId problemName tags problemLink stars")
      .skip(skip)
      .limit(limit)
      .lean(),
    Note.countDocuments(query)
  ]);

  const response = {
    success: true,
    page,
    totalProblems: total,
    totalPages: Math.ceil(total / limit),
    count: notes.length,
    data: notes
  };

  // Cache for 24 hours (SWR strategy)
  await redisClient.set(cacheKey, JSON.stringify(response), { EX: 86400 });
  
  return response;
}

/* ================= CONTROLLERS ================= */

/* 1️⃣ CREATE NEW PROBLEM */
exports.createProblem = async (req, res) => {
  try {
    const userId = req.userId;
    let problemName = req.body.problemName?.trim().toLowerCase();

    // Check Duplicate
    const existing = await Note.findOne({ problemName, user: userId });
    if (existing) return res.status(409).json({ success: false, message: "Problem already exists" });

    // Generate ID
    const lastProblem = await Note.findOne({ user: userId }).sort({ problemId: -1 }).select("problemId");
    const currentMaxId = lastProblem ? lastProblem.problemId : 0;
    
    if (currentMaxId >= 50) return res.status(409).json({ success: false, message: "Limit reached (50)" });

    const note = await Note.create({
      ...req.body,
      problemName,
      problemId: currentMaxId + 1,
      user: userId
    });

    // 🔥 INSTANT UPDATE: Clears "All" AND "Importance" lists
    await clearUserCache(userId);

    res.status(201).json({ success: true, data: note });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* 2️⃣ GET ALL PROBLEMS (SWR Cached) */
exports.getAllProblem = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    
    const cacheKey = `notes:all:${userId}:${page}`;

    // 1. Check Cache
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    // 2. Fetch & Cache
    const query = { user: userId };
    const data = await fetchAndCacheNotes(query, userId, page, limit, cacheKey);
    // console.log(data)
    
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* 3️⃣ GET SINGLE PROBLEM (SWR Cached) */
exports.getSingleProblem = async (req, res) => {
  try {
    const userId = req.userId;
    const problemId = Number(req.params.problemId);
    if (isNaN(problemId)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const cacheKey = `note:${userId}:${problemId}`;

    // 1. Check Cache
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    // 2. DB Fetch
    const note = await Note.findOne({ user: userId, problemId });
    if (!note) return res.status(404).json({ success: false, message: "Not found" });

    // 3. Cache
    await redisClient.set(cacheKey, JSON.stringify(note), { EX: 86400 });

    res.status(200).json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* 4️⃣ UPDATE PROBLEM */
exports.updateProblem = async (req, res) => {
  try {
    const userId = req.userId;
    const problemId = Number(req.params.problemId);
    if (isNaN(problemId)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const updated = await Note.findOneAndUpdate(
      { user: userId, problemId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: "Problem not found" });

    // 🔥 INSTANT UPDATE: Clears "All", "Importance", and "Single" caches
    await clearUserCache(userId);

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* 5️⃣ DELETE PROBLEM */
exports.deleteProblem = async (req, res) => {
  try {
    const userId = req.userId;
    const problemId = Number(req.params.problemId);
    if (isNaN(problemId)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const deleted = await Note.findOneAndDelete({ user: userId, problemId });
    if (!deleted) return res.status(404).json({ success: false, message: "Problem not found" });

    // 🔥 INSTANT UPDATE: Clears everything so it disappears from lists
    await clearUserCache(userId);

    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* 6️⃣ GET BY IMPORTANCE (SWR Cached) */
exports.getElementByImportance = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;

    const cacheKey = `notes:importance:${userId}:${page}`;

    // 1. Check Cache
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    // 2. Fetch & Cache
    const query = { user: userId }; // Note: You can add { stars: 3 } filter here if needed, but your original code returned all sorted
    
    // We reuse the helper but we might want to SORT by stars
    const skip = (page - 1) * limit;
    const [notes, total] = await Promise.all([
      Note.find(query)
        .sort({ stars: -1, problemId: 1 }) // Sorted by Importance
        .select("problemId problemName stars tags problemLink")
        .skip(skip)
        .limit(limit)
        .lean(),
      Note.countDocuments(query)
    ]);

    const response = {
      success: true,
      page,
      totalProblems: total,
      totalPages: Math.ceil(total / limit),
      count: notes.length,
      data: notes
    };

    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 86400 });

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ... Tag & Specific Star routes (Keep as is) ...
/* 7️⃣ GET BY TAG (With Pagination & Caching) */
exports.getElementByTag = async (req, res) => {
    try {
        const userId = req.userId;
        const { tag } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const cacheKey = `notes:tag:${userId}:${tag}:${page}`;

        // 1. Check Cache
        const cached = await redisClient.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        // 2. DB Fetch & Count
        const query = { tags: { $in: [tag] }, user: userId };

        const [notes, total] = await Promise.all([
            Note.find(query)
                .sort({ stars: -1, problemId: 1 }) // Sorted by importance
                .select("problemId problemName stars tags problemLink")
                .skip(skip)
                .limit(limit)
                .lean(),
            Note.countDocuments(query)
        ]);

        const response = {
            success: true,
            page,
            totalProblems: total,
            totalPages: Math.ceil(total / limit),
            count: notes.length,
            data: notes
        };

        // 3. Cache
        await redisClient.set(cacheKey, JSON.stringify(response), { EX: 86400 });

        res.status(200).json(response);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/* 8️⃣ GET BY SPECIFIC STAR (With Pagination & Caching) */
exports.getElementBySpecificStar = async (req, res) => {
    try {
        const userId = req.userId;
        const stars = parseInt(req.params.stars);
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const cacheKey = `notes:stars:${userId}:${stars}:${page}`;

        // 1. Check Cache
        const cached = await redisClient.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        // 2. DB Fetch & Count
        const query = { stars, user: userId };

        const [notes, total] = await Promise.all([
            Note.find(query)
                .sort({ updatedAt: -1 }) // Sorted by newest
                .select("problemId problemName stars tags problemLink")
                .skip(skip)
                .limit(limit)
                .lean(),
            Note.countDocuments(query)
        ]);

        const response = {
            success: true,
            page,
            totalProblems: total,
            totalPages: Math.ceil(total / limit),
            count: notes.length,
            data: notes
        };

        // 3. Cache
        await redisClient.set(cacheKey, JSON.stringify(response), { EX: 86400 });

        res.status(200).json(response);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
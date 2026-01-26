const mongoose = require("mongoose");
const Note = require("../models/Note");

/* ================================
   CREATE NEW PROBLEM
================================ */
exports.createProblem = async (req, res) => {
  try {

        // 1️⃣ Check duplicate problem name (global OR per user — choose)
     let problemName = req.body.problemName?.trim().toLowerCase()
     const existing = await Note.findOne({ problemName });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Problem already exists"
        });
      }
    // 1️⃣ Find last inserted problem (highest problemId)
    const lastProblem = await Note.findOne()
      .sort({ problemId: -1 })
      .select("problemId");
  
      if(lastProblem.problemId===50)      // user cannot make more that 50 problems
      {
        return res.status(409).json({
          success: false,
          message: "Only 50 Problems Can Be Created"
        });
      }
    // 2️⃣ Decide next problemId
    const nextProblemId = lastProblem ? lastProblem.problemId + 1 : 1;

    req.body.problemName = req.body.problemName?.trim().toLowerCase();

    // 3️⃣ Create new problem with auto problemId
    const note = await Note.create({
      ...req.body,
      problemId: nextProblemId
    });

    res.status(201).json({
      success: true,
      message: "Problem created successfully",
      data: note
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};


/* ================================
   GET ALL PROBLEMS (MAIN PAGE)
   Supports:
   - pagination
   - search
   - sort by stars
================================ */
exports.getAllProblem = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const notes = await Note.find({})
      .sort({ problemId: 1 })           // 🔥 important
      .select("problemId problemName tags problemLink")
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      page,
      count: notes.length,
      data: notes
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};



/* ================================
   GET SINGLE PROBLEM BY ID
================================ */
exports.getSingleProblem = async (req, res) => {
  try {
    const problemId = Number(req.params.problemId);
    console.log(req.params);
    if (isNaN(problemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid problemId"
      });
    }

    const note = await Note.findOne({ problemId });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Problem not found"
      });
    }

    res.status(200).json({
      success: true,
      data: note
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ================================
   UPDATE PROBLEM
================================ */
exports.updateProblem = async (req, res) => {
  try {
    const problemId = Number(req.params.problemId);

    if (isNaN(problemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid problemId"
      });
    }

    const updatedNote = await Note.findOneAndUpdate(
      { problemId },       // 🔥 correct filter
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedNote) {
      return res.status(404).json({
        success: false,
        message: "Problem not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Problem updated successfully",
      data: updatedNote
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};


/* ================================
   DELETE PROBLEM
================================ */
exports.deleteProblem = async (req, res) => {
  try {
    const problemId = Number(req.params.problemId);

    if (isNaN(problemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid problemId"
      });
    }

    const deletedNote = await Note.findOneAndDelete({ problemId });

    if (!deletedNote) {
      return res.status(404).json({
        success: false,
        message: "Problem not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Problem deleted successfully",
      data: deletedNote   // optional but useful
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/* ================================
   GET PROBLEMS BY TAG
================================ */
exports.getElementByTag = async (req, res) => {
  try {
    const { tag } = req.params;

    const notes = await Note.find({
      tags: { $in: [tag] }
    }).sort({ stars: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ================================
   GET PROBLEMS BY IMPORTANCE (STARS)
================================ */
exports.getElementBySpecificStar = async (req, res) => {
  try {
    const stars = parseInt(req.params.stars);
     console.log(stars);
    if (![0, 1, 2, 3].includes(stars)) {
      return res.status(400).json({
        success: false,
        message: "Stars must be between 0 and 3"
      });
    }

    const notes = await Note.find({ stars })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


exports.getElementByImportance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const notes = await Note.find({})
      .sort({ stars: -1, problemId: 1 })   // 🔥 stars DESC
      .select("problemId problemName stars tags problemLink")
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      page,
      count: notes.length,
      data: notes
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

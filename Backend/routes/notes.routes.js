const express = require("express");
const {
  createProblem,
  getAllProblem,
  getSingleProblem,
  updateProblem,
  deleteProblem,
  getElementByTag,
  getElementBySpecificStar,
  getElementByImportance
} = require("../controllers/noteController");

const router = express.Router();

/* CREATE NEW PROBLEM */
router.post("/new", auth, createProblem); //✅

/* GET ALL PROBLEMS (main page) */
router.get("/problem", auth, getAllProblem);   //✅

// Get Problem According to its impoortance 
router.get("/problemByImportance", auth, getElementByImportance);    //✅

/* FILTERS */
router.get("/tag/:tag", auth, getElementByTag);            // /notes/tag/binary-search    //✅
router.get("/stars/:stars", auth, getElementBySpecificStar); // /notes/stars/3   //✅

/* GET SINGLE PROBLEM */
router.get("/problemById/:problemId", auth, getSingleProblem);   //✅

/* UPDATE PROBLEM */
router.put("/problem/:problemId", auth, updateProblem); //✅

/* DELETE PROBLEM */
router.delete("/problem/:problemId", auth, deleteProblem); //✅

module.exports = router;

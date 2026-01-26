const express = require("express");
const router = express.Router();

const {
  getMe,
  saveAccounts,
  getDashboard
} = require("../controllers/dashboardController");

const auth = require("../middlewares/auth");

router.get("/me", auth, getMe);
router.post("/accounts", auth, saveAccounts);
router.get("/dashboard", auth, getDashboard);

module.exports = router;

const express = require("express");
const dashRouter = express.Router();
const auth = require("../middlewares/auth");
const {
  getMe,
  saveAccounts,
  getDashboard
} = require("../controllers/dashboardController");

dashRouter.get("/me", auth, getMe);
dashRouter.post("/accounts", auth, saveAccounts);
dashRouter.get("/stats", auth, getDashboard);

module.exports = dashRouter;

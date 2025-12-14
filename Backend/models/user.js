const mongoose = require("mongoose");

// Simple schema: Only Username & Profile Link
const platformSchema = new mongoose.Schema({
  username: { type: String, trim: true },
  profile: { type: String, trim: true } 
}, { _id: false }); // _id: false prevents creating extra IDs for this sub-object

const userSchema = new mongoose.Schema(
  {
    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 5
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    // The DB only stores the identity, not the score
    platforms: {
      LeetCode: { type: platformSchema, default: () => ({}) },
      Codeforces: { type: platformSchema, default: () => ({}) },
      CodeChef: { type: platformSchema, default: () => ({}) },
      GFG: { type: platformSchema, default: () => ({}) }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
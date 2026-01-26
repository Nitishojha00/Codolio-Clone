const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    problemId:{
      type: Number,
      unique:true
    },
    problemName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
      index: true,
      lowercase:true,
      unique:true
    },

    problemDescription: {
      type: String,
      trim: true,
      maxlength: 200
    },

    problemLink: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    stars: {
      type: Number,
      enum: {
        values: [0, 1, 2, 3],
        message: "{VALUE} is not a valid star rating"
      },
      min: 0,
      max: 3,
      default: 0
    },

    tags: {
      type: [String],
      default: [],
      maxlength: 10, // max 10 tags
      validate: {
        validator: v => v.length <= 10,
        message: "You can add maximum 10 tags"
      }
    },

    mistake: {
      type: String,
      trim: true,
      maxlength: 500
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true // 🔥 auto adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Note", noteSchema);

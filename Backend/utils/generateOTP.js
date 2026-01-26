const crypto = require("crypto");

const generateOTP = () => {
  return crypto.randomInt(1000, 10000).toString();
};

module.exports = generateOTP;

// require("dotenv").config();
const axios = require("axios");

const sendEmail = async (email, otp) => {
  const res = await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        name: "Codolio",
        email: "no-reply@codolio.com"
      },
      to: [{ email }],
      subject: "Email Verification OTP",
      htmlContent: `
        <h2>Email Verification</h2>
        <h1>${otp}</h1>
        <p>This OTP is valid for 2 minutes.</p>
      `
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,   // 🔑 THIS IS THE KEY
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    }
  );

  return res.data;
};

module.exports = sendEmail;

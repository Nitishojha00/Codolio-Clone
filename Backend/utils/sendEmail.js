const SibApiV3Sdk = require("@getbrevo/brevo");

const client = SibApiV3Sdk.ApiClient.instance;

// 🔐 API KEY
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async (email, otp) => {
  await emailApi.sendTransacEmail({
    sender: {
      email: "no-reply@codolio.com",   // can be anything initially
      name: "Codolio"
    },
    to: [{ email }],
    subject: "Email Verification OTP",
    htmlContent: `
      <h2>Email Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 2 minutes.</p>
    `
  });
};

module.exports = sendEmail;

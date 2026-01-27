const Brevo = require("@getbrevo/brevo");

// Create API instance
const apiInstance = new Brevo.TransactionalEmailsApi();

// Set API key
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const sendEmail = async (email, otp) => {
  await apiInstance.sendTransacEmail({
    sender: {
      email: "no-reply@codolio.com",
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

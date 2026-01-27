const sendEmail = require("./utils/sendEmail");

sendEmail("nitishojha651@gmail.com", "1234")
  .then(() => console.log("✅ Email sent"))
  .catch(console.error);

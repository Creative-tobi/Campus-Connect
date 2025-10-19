const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, text) => {
  try {
    const info = await Transporter.sendMail({
      from: process.env.EMAIL_USER || "adefokunadeoluwaisrael@gmail.com",
      to,
      subject,
      text,
    });
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
};

module.exports = {
  sendEmail,
};

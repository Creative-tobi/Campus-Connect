// const nodemailer = require("nodemailer");
// const dotenv = require("dotenv");
// dotenv.config();

// const Transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: process.env.SMTP_SECURE === "true",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// const sendEmail = async (to, subject, text) => {
//   try {
//     const info = await Transporter.sendMail({
//       from: process.env.EMAIL_USER || "adefokunadeoluwaisrael@gmail.com",
//       to,
//       subject,
//       text,
//     });
//     console.log("Email sent: " + info.response);
//   } catch (error) {
//     console.error("Error sending email: ", error);
//   }
// };

// module.exports = {
//   sendEmail,
// };

// Using your provided setup
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// HTML template function for beautiful emails
const generateEmailTemplate = (subject, content) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${subject}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 0.8em; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Campus Connect</h2>
                <p>Your University Social Network</p>
            </div>
            <div class="content">
                <h3>${subject}</h3>
                <p>${content}</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Campus Connect. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>`;
};

const sendEmail = async (to, subject, text, html = null) => {
    try {
        const emailHtml = html || generateEmailTemplate(subject, text);
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER || "adefokunadeoluwaisrael@gmail.com",
            to,
            subject,
            text, // Fallback plain text
            html: emailHtml, // HTML body
        });
        console.log("Email sent: " + info.response);
        return info;
    } catch (error) {
        console.error("Error sending email: ", error);
        throw error; // Re-throw to handle in calling function
    }
};

module.exports = {
    sendEmail,
};

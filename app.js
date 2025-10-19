const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
dotenv.config();
const sendMail = require("./services/nodemailer");

connectDB();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.listen(PORT, () => {
  console.log(`Server running ${PORT}`);
});

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const bodyparser = require("body-parser");
const path = require("path");
dotenv.config();
const sendMail = require("./services/nodemailer");

connectDB();

const PORT = process.env.PORT || 3000;

const app = express();

app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

app.use(express.static("public"))

app.set("views", path.join(__dirname, "views"));

// app.use("/", require("./routes/router"));
app.get('/', (req, res) => {
  res.render('index'); 
});

app.listen(PORT, () => {
  console.log(`Server running ${PORT}`);
});

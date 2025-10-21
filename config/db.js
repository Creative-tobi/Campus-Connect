const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGO_DB_URL = process.env.MONGO_DB;

const connectDB = async () => {
  try {
    await mongoose.connect(
      MONGO_DB_URL
    );
    console.log(`mongodb connected ${MONGO_DB_URL}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB;

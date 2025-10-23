// const express = require("express");
// const dotenv = require("dotenv");
// const connectDB = require("./config/db");
// const bodyparser = require("body-parser");
// const path = require("path");
// dotenv.config();
// const sendMail = require("./services/nodemailer");

// connectDB();

// const PORT = process.env.PORT || 3000;

// const app = express();

// app.set("view engine", "ejs");
// app.use(bodyparser.urlencoded({ extended: true }));
// app.use(bodyparser.json());

// app.use(express.static("public"))

// app.set("views", path.join(__dirname, "views"));

// // app.use("/", require("./routes/router"));
// app.get('/', (req, res) => {
//   res.render('index'); 
// });

// app.listen(PORT, () => {
//   console.log(`Server running ${PORT}`);
// });

// app.js (updated for Campus Connect)
const express = require("express");
// const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
require("./config/cloudinary"); // Initialize Cloudinary configuration

dotenv.config();

// Function to create the initial admin user
const createInitialAdmin = async () => {
    try {
        const User = require('./models/User.model');
        const bcrypt = require('bcrypt');

        const existingAdmin = await User.findOne({ email: 'kunlexlatest@gmail.com' });
        if (existingAdmin) {
            console.log('Admin user already exists.✅');
            return;
        }

        const hashedPassword = await bcrypt.hash('Latest5678', 12);

        const adminUser = new User({
            firstName: 'Lateef',
            lastName: 'Kammaldeen',
            email: 'kunlexlatest@gmail.com',
            password: hashedPassword,
            faculty: 'administration',
            role: 'admin',
            isVerified: true, // Already verified
            phone: '08075373527' // Add a placeholder phone if required by schema
        });

        await adminUser.save();
        console.log('✅ Initial admin user created successfully.');
    } catch (error) {
        console.error('❌ Error creating initial admin:', error.message);
        process.exit(1); // Exit if admin creation fails critically
    }
};

(async () => {
  await connectDB();
  await createInitialAdmin(); // Ensure admin exists before starting server

  const app = express({limit: '50mb' });

  // app.use(cors({ origin: "*", credentials: true }));

  app.use(express.json());
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Route loading with error handling
  console.log("Loading auth routes...");
  try {
    const authroutes = require("./routes/auth.route");
    app.use('/api/auth', authroutes);
    console.log("✅ Auth routes loaded successfully");
  } catch (error) {
    console.log("❌ Error in auth routes:", error.message);
    process.exit(1);
  }

  console.log("Loading user routes...");
  try {
    const userroutes = require("./routes/user.route");
    app.use('/api/users', userroutes);
    console.log("✅ User routes loaded successfully");
  } catch (error) {
    console.log("❌ Error in user routes:", error.message);
    process.exit(1);
  }

  console.log("Loading club routes...");
  try {
    const clubroutes = require("./routes/club.route");
    app.use('/api/clubs', clubroutes);
    console.log("✅ Club routes loaded successfully");
  } catch (error) {
    console.log("❌ Error in club routes:", error.message);
    process.exit(1);
  }

  console.log("Loading admin routes...");
  try {
    const adminroutes = require("./routes/admin.route");
    app.use('/api/admin', adminroutes);
    console.log("✅ Admin routes loaded successfully");
  } catch (error) {
    console.log("❌ Error in admin routes:", error.message);
    process.exit(1);
  }

  console.log("Loading notification routes...");
  try {
    const notificationroutes = require("./routes/notification.route");
    app.use('/api/notifications', notificationroutes);
    console.log("✅ Notification routes loaded successfully");
  } catch (error) {
    console.log("❌ Error in notification routes:", error.message);
    process.exit(1);
  }

  app.get("/", (req, res) => res.json({ message: "Campus Connect API is running successfully!" }));

  // Error handling middleware
  app.use((err, req, res, next) => {
      console.error("❌ Server Error:", err.stack);
      res.status(500).json({ error: 'Something went wrong!' });
  });

  const PORT = process.env.PORT;
  app.listen(PORT, () =>
    console.log(`🚀 Campus Connect Server running on http://localhost:${PORT}`)
  );
})();

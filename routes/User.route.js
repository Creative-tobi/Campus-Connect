const Club = require("../models/Club.model");
const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  getDashboard,
  getUserPosts,
  getUserProfile,
  updateUserProfile,
  sendJoinRequest,
  leaveClub,
  getJoinedClubs,
  getClubDetails,
  searchClubs,
  getNotifications,
  markNotificationAsRead,
  uploadProfilePicture,
  uploadProfilePictureMiddleware,
} = require("../controllers/User.controller");

// Protected user routes
router.get(
  "/dashboard",
  authenticate,
  authorize("user", "club_owner", "admin"),
  getDashboard
);
router.post(
  "/clubs/:id/join",
  authenticate,
  authorize("user", "club_owner", "admin"),
  sendJoinRequest
);
router.delete(
  "/clubs/:id/leave",
  authenticate,
  authorize("user", "club_owner", "admin"),
  leaveClub
);
router.get(
  "/clubs/joined",
  authenticate,
  authorize("user", "club_owner", "admin"),
  getJoinedClubs
);
router.get(
  "/clubs/:id",
  authenticate,
  authorize("user", "club_owner", "admin"),
  getClubDetails
);

router.get("/clubs", searchClubs);
router.get(
  "/notifications",
  authenticate,
  authorize("user", "club_owner", "admin"),
  (req, res) => {
    // Check if this is an API request (has Accept header for JSON or query param)
    if (
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.query.format === "json" ||
      req.xhr
    ) {
      // API request - return JSON data
      return getNotifications(req, res);
    } else {
      // Page request - render the view
      res.render("dashboard/user/notifications");
    }
  }
);
router.put(
  "/notifications/:id/read",
  authenticate,
  authorize("user", "club_owner", "admin"),
  markNotificationAsRead
);
router.post(
  "/upload-profile-picture",
  authenticate,
  authorize("user", "club_owner", "admin"),
  uploadProfilePictureMiddleware,
  uploadProfilePicture
); // Multer middleware should be added here

router.get(
  "/posts",
  authenticate,
  authorize("user", "club_owner", "admin"),
  getUserPosts
);

router.get(
  "/profile",
  authenticate,
  authorize("user", "club_owner", "admin"),
  getUserProfile
);
router.put(
  "/profile",
  authenticate,
  authorize("user", "club_owner", "admin"),
  updateUserProfile
);

// Route to render the clubs page
router.get(
  "/clubs-page",
  authenticate,
  authorize("user", "club_owner", "admin"),
  (req, res) => {
    res.render("dashboard/user/clubs");
  }
);

module.exports = router;

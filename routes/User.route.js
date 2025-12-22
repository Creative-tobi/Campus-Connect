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
const { createPost, getClubPosts } = require("../controllers/club.controller");
const { getAllPosts } = require("../controllers/admin.controller");

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

router.get(
  "/clubs",
  authenticate,
  authorize("user", "club_owner", "admin"),
  (req, res) => {
    // Check if this is a page request (browser navigation)
    if (req.headers.accept && req.headers.accept.includes("text/html")) {
      // Page request - render the view
      res.render("dashboards/user/clubs", { user: req.user });
    } else {
      // API request - return JSON data
      return searchClubs(req, res);
    }
  }
);
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
      res.render("dashboards/user/notification");
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
  (req, res) => {
    // Check if this is an API request (has Accept header for JSON or query param)
    if (
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.query.format === "json" ||
      req.xhr
    ) {
      // API request - return JSON data
      return getUserPosts(req, res);
    } else {
      // Page request - render the view
      return getUserPosts(req, res);
    }
  }
);

router.get(
  "/create-post",
  authenticate,
  authorize("club_owner"),
  (req, res) => {
    res.render("dashboards/club_owner/posts", { user: req.user, clubId: req.query.clubId });
  }
);

// Post routes
router.post("/posts", authenticate, authorize("club_owner"), createPost);
router.get("/posts/all", authenticate, authorize("admin"), getAllPosts);
router.get(
  "/posts/club/:id",
  authenticate,
  authorize("user", "club_owner", "admin"),
  getClubPosts
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
    res.render("dashboards/user/clubs");
  }
);

module.exports = router;

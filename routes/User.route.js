const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  getDashboard,
  getUserPosts,
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
  authorize("user", "club_owner"),
  sendJoinRequest
);
router.delete(
  "/clubs/:id/leave",
  authenticate,
  authorize("user", "club_owner"),
  leaveClub
);
router.get(
  "/clubs/joined",
  authenticate,
  authorize("user", "club_owner"),
  getJoinedClubs
);
router.get(
  "/clubs/:id",
  authenticate,
  authorize("user", "club_owner"),
  getClubDetails
);
router.get(
  "/clubs",
  authenticate,
  authorize("user", "club_owner"),
  searchClubs
);
router.get(
  "/notifications",
  authenticate,
  authorize("user", "club_owner", "admin"),
  getNotifications
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
  authorize("user", "club_owner"),
  getUserPosts
);

module.exports = router;

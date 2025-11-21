const express = require("express");
const router = express.Router();
const {
  createClub,
  getMyClubs,
  updateClub,
  deleteClub,
  getClubById,
  getActiveClubs,
  getAllJoinRequests,
  getJoinRequests,
  respondToJoinRequest,
  getClubMembers,
  createPost,
  getClubPosts,
  deletePost,
  // removeMember,
  // getClubManage,
  uploadClubImageMiddleware,
} = require("../controllers/club.controller");
const { authenticate } = require("../middleware/auth");
const { allowRoles } = require("../middleware/role");

// Routes for club management (club owners only)
router.get("/my", authenticate, allowRoles("club_owner"), getMyClubs);
router.post(
  "/create",
  authenticate,
  allowRoles("club_owner"),
  uploadClubImageMiddleware,
  createClub
);
router.put(
  "/:id",
  authenticate,
  allowRoles("club_owner"),
  uploadClubImageMiddleware,
  updateClub
);
router.delete("/:id", authenticate, allowRoles("club_owner"), deleteClub);

// Routes for viewing clubs (public for active clubs, authenticated for others)
router.get("/public/:id", getClubById); // Public route for active clubs
router.get("/:id", authenticate, getClubById); // Authenticated route
// router.get(
//   "/:id/manage",
//   authenticate,
//   allowRoles("club_owner"),
//   getClubManage
// ); // Manage page route

// Routes for club members and requests (club owners only)
router.get(
  "/:id/requests",
  authenticate,
  allowRoles("club_owner"),
  getJoinRequests
);
router.put(
  "/:id/requests/:requestId",
  authenticate,
  allowRoles("club_owner"),
  respondToJoinRequest
);
router.get(
  "/:id/members",
  authenticate,
  allowRoles("club_owner"),
  getClubMembers
);
// router.delete(
//   "/:id/members/:memberId",
//   authenticate,
//   allowRoles("club_owner"),
//   removeMember
// );

// Routes for posts (club owners only for creating/deleting)
router.post(
  "/:id/posts",
  authenticate,
  allowRoles("club_owner"),
  uploadClubImageMiddleware,
  createPost
);
router.get("/:id/posts", authenticate, getClubPosts);
router.delete(
  "/:id/posts/:postId",
  authenticate,
  allowRoles("club_owner"),
  deletePost
);

// Public routes
router.get("/", getActiveClubs);

module.exports = router;

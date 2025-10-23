const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    createClub,
    getMyClubs,
    updateClub,
    deleteClub,
    getClubById,
    getActiveClubs,
    getJoinRequests,
    respondToJoinRequest,
    getClubMembers,
    createPost,
    getClubPosts,
    deletePost,
    uploadClubImageMiddleware
} = require('../controllers/club.controller');

// Public route for active clubs
router.get('/active', getActiveClubs);

// Protected routes for club owners
router.post('/', authenticate, authorize('user'), uploadClubImageMiddleware, createClub); // User creates club, becomes owner
router.get('/my', authenticate, authorize('club_owner'), getMyClubs);
router.put('/:id', authenticate, authorize('club_owner'), uploadClubImageMiddleware, updateClub);
router.delete('/:id', authenticate, authorize('club_owner'), deleteClub);
router.get('/:id', authenticate, authorize('user', 'club_owner', 'admin'), getClubById); // Anyone can view a club
router.get('/:id/requests', authenticate, authorize('club_owner'), getJoinRequests);
router.put('/:id/requests/:requestId', authenticate, authorize('club_owner'), respondToJoinRequest);
router.get('/:id/members', authenticate, authorize('user', 'club_owner', 'admin'), getClubMembers);

// Protected routes for club members/posts
router.post('/:id/posts', authenticate, authorize('club_owner'), uploadClubImageMiddleware, createPost);
router.get('/:id/posts', authenticate, authorize('user', 'club_owner', 'admin'), getClubPosts);
router.delete('/posts/:postId', authenticate, authorize('club_owner'), deletePost); // Owner can delete posts

module.exports = router;